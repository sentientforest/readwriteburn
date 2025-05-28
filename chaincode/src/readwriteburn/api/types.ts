import { ChainObject, ClassConstructor } from "@gala-chain/api";
import { IsNotEmpty, IsString } from "class-validator";

import { Fire } from "./Fire";
import { Submission } from "./Submission";
import { Vote } from "./Vote";
import { VoteCount } from "./VoteCount";
import { VoteRanking } from "./VoteRanking";

class IEntry extends ChainObject {
  @IsNotEmpty()
  @IsString()
  entryType?: string;

  @IsString()
  entryParent: string;
}

const RWB_TYPES: Record<string, ClassConstructor<IEntry>> = {};

RWB_TYPES[Fire.INDEX_KEY] = Fire;
RWB_TYPES[Submission.INDEX_KEY] = Submission;
RWB_TYPES[Vote.INDEX_KEY] = Vote;
RWB_TYPES[VoteCount.INDEX_KEY] = VoteCount;
RWB_TYPES[VoteRanking.INDEX_KEY] = VoteRanking;

export { RWB_TYPES, IEntry };
