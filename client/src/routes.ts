import { createMemoryHistory, createRouter } from "vue-router";

import "./assets/main.css";
import Account from "./components/Account.vue";
import FireStarter from "./components/FireStarter.vue";
import InfoPage from "./components/InfoPage.vue";
import NewSubmission from "./components/NewSubmission.vue";
import SubfireList from "./components/SubfireList.vue";
import SubmissionList from "./components/SubmissionList.vue";

const routes = [
  { path: "/", component: SubfireList },
  { path: "/firestarter", component: FireStarter },
  { path: "/f/:slug", component: SubmissionList },
  { path: "/f/:slug/submit", component: NewSubmission },
  { path: "/account", component: Account },
  { path: "/about", component: InfoPage }
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes
});
