import { ChainError } from "@gala-chain/api";
import {
  GalaChainContext,
  getObjectsByKeys,
  getObjectsByPartialCompositeKeyWithPagination,
  takeUntilUndefined
} from "@gala-chain/chaincode";

import { Submission, SubmissionByFire, SubmissionByParentEntry } from "./api/Submission";
import {
  FetchSubmissionsDto,
  FetchSubmissionsResDto,
  ISubmissionWithChildren,
  SubmissionWithChildren
} from "./api/dtos";

export async function fetchSubmissions(
  ctx: GalaChainContext,
  dto: FetchSubmissionsDto
): Promise<FetchSubmissionsResDto> {
  const { fireKey, entryParentKey, bookmark, limit } = dto;

  const query = [];

  if (entryParentKey !== undefined) {
    return fetchSubmissionsByParentEntry(ctx, {
      parentKey: entryParentKey,
      bookmark,
      limit
    });
  }

  if (fireKey !== undefined) {
    return fetchSubmissionsByFire(ctx, {
      fireKey,
      bookmark,
      limit
    });
  }

  const { results, metadata } = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    Submission.INDEX_KEY,
    query,
    Submission,
    dto.bookmark,
    dto.limit
  );

  const submissions = results.map((s) => {
    return new SubmissionWithChildren({
      ...s,
      submissionKey: s.getCompositeKey()
    });
  });

  return new FetchSubmissionsResDto({
    results: submissions,
    nextPageBookmark: metadata.bookmark
  });
}

export interface IFetchSubmissionsByFire {
  fireKey: string;
  bookmark?: string;
  limit?: number;
  maxDepth?: number;
}

export async function fetchSubmissionsByFire(
  ctx: GalaChainContext,
  data: IFetchSubmissionsByFire
): Promise<FetchSubmissionsResDto> {
  const { fireKey, bookmark, limit, maxDepth } = data;

  const query = [fireKey];

  const byFireQuery = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    SubmissionByFire.INDEX_KEY,
    query,
    SubmissionByFire,
    bookmark,
    limit
  );

  const submissionsByFire = byFireQuery.results;
  const nextPageBookmark = byFireQuery.metadata.bookmark;

  const submissionKeys = submissionsByFire.map((bf) => {
    return bf.submissionKey;
  });

  const submissions = await getObjectsByKeys(ctx, Submission, submissionKeys);

  const results: SubmissionWithChildren[] = await Promise.all(
    submissions.map((s) => {
      return populateDescendantsForSubmission(ctx, { entry: s, limit, maxDepth });
    })
  );

  return new FetchSubmissionsResDto({ results, nextPageBookmark });
}

export interface IFetchSubmissionsByParentEntry {
  parentKey: string;
  bookmark?: string;
  limit?: number;
}

export async function fetchSubmissionsByParentEntry(
  ctx: GalaChainContext,
  data: IFetchSubmissionsByParentEntry
): Promise<FetchSubmissionsResDto> {
  const { parentKey, bookmark, limit } = data;

  const query = [parentKey];

  const byParentQuery = await getObjectsByPartialCompositeKeyWithPagination(
    ctx,
    SubmissionByParentEntry.INDEX_KEY,
    query,
    SubmissionByParentEntry,
    bookmark,
    limit
  );

  const submissionsByParent = byParentQuery.results;
  const submissionsByParentNextPageBookmark = byParentQuery.metadata.bookmark;

  const submissionKeys = submissionsByParent.map((bp) => {
    return bp.submissionKey;
  });

  const childSubmissions = await getObjectsByKeys(ctx, Submission, submissionKeys);

  const children: SubmissionWithChildren[] = [];

  for (const c of childSubmissions) {
    const result = new SubmissionWithChildren({
      ...c,
      parentKey: parentKey,
      submissionKey: c.getCompositeKey()
    });

    children.push(result);
  }

  const response = new FetchSubmissionsResDto({
    results: children,
    nextPageBookmark: submissionsByParentNextPageBookmark
  });

  return response;
}

export interface IPopulateSubmissionWithChildren {
  entry: SubmissionWithChildren;
  limit?: number;
  depth?: number;
  maxDepth?: number;
}

export async function populateSubmissionWithChildren(
  ctx: GalaChainContext,
  data: IPopulateSubmissionWithChildren
): Promise<SubmissionWithChildren> {
  const { entry, limit, depth, maxDepth } = data;

  const currentDepth = depth ? depth + 1 : 1;

  if (currentDepth >= (maxDepth ?? 10)) {
    return entry;
  }

  const childrenQuery = await fetchSubmissionsByParentEntry(ctx, {
    parentKey: entry.submissionKey,
    limit: limit
  }).catch((e) => {
    ctx.logger.debug(
      `Failed to fetchSubmissionsByParentEntry in populateSubmissionWithChildren attempt ` +
        `for submissionKey: ${entry.submissionKey} -- ${e}`
    );
    throw ChainError.from(e);
  });

  entry.childrenNextPageBookmark = childrenQuery.nextPageBookmark;

  if (childrenQuery.results.length < 1) {
    entry.children = [];
    return entry;
  }

  const populateChildrenQueries = childrenQuery.results.map((child) => {
    return populateSubmissionWithChildren(ctx, {
      entry: child,
      limit: limit,
      depth: currentDepth,
      maxDepth: maxDepth
    });
  });

  const populated = await Promise.all(populateChildrenQueries).catch((e) => {
    // todo: define more specific error
    ctx.logger.debug(
      `Failed to execute all populateChildrenQueries for submissionKey: ${entry.submissionKey} -- ${e}`
    );

    throw ChainError.from(e);
  });

  entry.children = populated;

  return entry;
}

export interface IPopulateDescendantsForSubmission {
  entry: Submission;
  limit?: number;
  maxDepth?: number;
}

export async function populateDescendantsForSubmission(
  ctx: GalaChainContext,
  data: IPopulateDescendantsForSubmission
): Promise<SubmissionWithChildren> {
  const { entry, limit, maxDepth } = data;

  const response = new SubmissionWithChildren({
    ...entry,
    submissionKey: entry.getCompositeKey(),
    children: []
  });

  await populateSubmissionWithChildren(ctx, {
    entry: response,
    limit,
    maxDepth
  });

  return response;
}
