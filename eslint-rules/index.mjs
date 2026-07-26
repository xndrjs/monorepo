import { noTodoDocMarker } from "./no-todo-doc-marker.mjs";
import { infrastructurePrefixBoundary } from "./infrastructure-prefix-boundary.mjs";

/** @type {import("eslint").ESLint.Plugin} */
const cleanTemplate = {
  rules: {
    "infrastructure-prefix-boundary": infrastructurePrefixBoundary,
    "no-todo-doc-marker": noTodoDocMarker,
  },
};

export default cleanTemplate;
