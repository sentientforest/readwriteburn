import { createMemoryHistory, createRouter } from "vue-router";

import "./assets/main.css";
import AccountDetails from "./components/AccountDetails.vue";
import AdminDashboard from "./components/AdminDashboard.vue";
import AnalyticsDashboard from "./components/AnalyticsDashboard.vue";
import ContentVerification from "./components/ContentVerification.vue";
import FireList from "./components/FireList.vue";
import FireStarter from "./components/FireStarter.vue";
import InfoPage from "./components/InfoPage.vue";
import ModerationPanel from "./components/ModerationPanel.vue";
import NewSubmission from "./components/NewSubmission.vue";
import SubmissionList from "./components/SubmissionList.vue";
import SubfireCreator from "./components/SubfireCreator.vue";
import UserInsightsDashboard from "./components/UserInsightsDashboard.vue";
import VoteExplorer from "./components/VoteExplorer.vue";
import VoteLeaderboard from "./components/VoteLeaderboard.vue";

const routes = [
  { path: "/", component: FireList },
  { path: "/firestarter", component: FireStarter },
  { path: "/f/:slug", component: SubmissionList },
  { path: "/f/:slug/submit", component: NewSubmission },
  { path: "/f/:slug/reply", component: NewSubmission }, // For replies with ?replyTo=id
  { path: "/f/:slug/subfire", component: SubfireCreator },
  { path: "/submissions/:id/verify", component: ContentVerification },
  { path: "/verify", component: ContentVerification },
  { path: "/votes", component: VoteExplorer },
  { path: "/votes/leaderboard", component: VoteLeaderboard },
  { path: "/analytics", component: AnalyticsDashboard },
  { path: "/insights", component: UserInsightsDashboard },
  { path: "/admin", component: AdminDashboard },
  { path: "/admin/moderation", component: ModerationPanel },
  { path: "/account", component: AccountDetails },
  { path: "/about", component: InfoPage }
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes
});
