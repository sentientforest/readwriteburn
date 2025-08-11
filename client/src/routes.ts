import { createRouter, createWebHistory } from "vue-router";

import "./assets/main.css";
// Core components (loaded immediately)
import FireList from "./components/FireList.vue";
import FireStarter from "./components/FireStarter.vue";
import NewSubmission from "./components/NewSubmission.vue";
import SubmissionList from "./components/SubmissionList.vue";

// Non-critical components (lazy loaded)
const AccountDetails = () => import("./components/AccountDetails.vue");
const AdminDashboard = () => import("./components/AdminDashboard.vue");
const AnalyticsDashboard = () => import("./components/AnalyticsDashboard.vue");
const ContentVerification = () => import("./components/ContentVerification.vue");
const InfoPage = () => import("./components/InfoPage.vue");
const ModerationPanel = () => import("./components/ModerationPanel.vue");
const SubfireCreator = () => import("./components/SubfireCreator.vue");
const UserInsightsDashboard = () => import("./components/UserInsightsDashboard.vue");
const VoteExplorer = () => import("./components/VoteExplorer.vue");
const VoteLeaderboard = () => import("./components/VoteLeaderboard.vue");

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
  history: createWebHistory('/'),
  routes
});
