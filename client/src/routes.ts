import { createMemoryHistory, createRouter } from "vue-router";

import "./assets/main.css";
import AccountDetails from "./components/AccountDetails.vue";
import FireList from "./components/FireList.vue";
import FireStarter from "./components/FireStarter.vue";
import InfoPage from "./components/InfoPage.vue";
import NewSubmission from "./components/NewSubmission.vue";
import SubmissionList from "./components/SubmissionList.vue";

const routes = [
  { path: "/", component: FireList },
  { path: "/firestarter", component: FireStarter },
  { path: "/f/:slug", component: SubmissionList },
  { path: "/f/:slug/submit", component: NewSubmission },
  { path: "/account", component: AccountDetails },
  { path: "/about", component: InfoPage }
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes
});
