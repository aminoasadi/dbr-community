import { apiInitializer } from "discourse/lib/api";
import { setupAuth } from "../../deep-blue-radar/auth";
import { setupHeader } from "../../deep-blue-radar/header";
import { setupSidebar } from "../../deep-blue-radar/sidebar";
import { setupTopicList } from "../../deep-blue-radar/topic-list";
import { setupTopicPage } from "../../deep-blue-radar/topic-page";
import { setupComposer } from "../../deep-blue-radar/composer";
import { setupCards } from "../../deep-blue-radar/cards";
import { setupRadar } from "../../deep-blue-radar/radar";
import { setupAnimations } from "../../deep-blue-radar/animations";

export default apiInitializer("1.13.0", (api) => {
  setupAuth(api);
  setupHeader(api);
  setupSidebar(api);
  setupTopicList(api);
  setupTopicPage(api);
  setupComposer(api);
  setupCards(api);
  setupRadar(api);
  setupAnimations(api);
});
