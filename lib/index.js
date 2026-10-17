import { registerPluginUpdater } from "./plugin-updater.js";
import { apply as installHost, inject as hostInject } from "./host-install.js";
const inject = ["webServer", ...hostInject];
async function apply(ctx) {
  let disposeUpdater = () => {
  };
  try {
    disposeUpdater = registerPluginUpdater(ctx, {
      endpoint: "/api/hxc0624/dsh-session-manager/update",
      packageName: "@hxc0624/dsh-session-manager",
      manifestUrl: new URL("../package.json", import.meta.url)
    });
  } catch (error) {
    ctx.logger?.warn?.(`archive-manager: update route skipped: ${String(error)}`);
  }
  let disposeHost;
  try {
    disposeHost = await installHost(ctx);
  } catch (error) {
    disposeUpdater();
    throw error;
  }
  return async () => {
    try {
      disposeUpdater();
    } finally {
      await disposeHost();
    }
  };
}
export {
  apply,
  inject
};
