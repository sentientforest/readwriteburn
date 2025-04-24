import { createMemoryHistory, createRouter } from "vue-router";
import SubfireList from "./components/SubfireList.vue";
import SubmissionList from "./components/SubmissionList.vue";
import NewSubmission from "./components/NewSubmission.vue";
import Account from "./components/Account.vue";
import InfoPage from "./components/InfoPage.vue";

import "./assets/main.css";

const routes = [
  { path: "/", component: SubfireList },
  { path: "/f/:slug", component: SubmissionList },
  { path: "/f/:slug/submit", component: NewSubmission },
  { path: "/account", component: Account },
  { path: "/about", component: InfoPage }
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes
});
