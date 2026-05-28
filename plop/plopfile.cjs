require("tsx/cjs");

const { registerZodVersionHelper } = require("./common/zod-version.utils.ts");
const {
  registerXndrjsVersionHelper,
} = require("./common/xndrjs-version.utils.ts");
const {
  registerCorePackageGenerator,
} = require("./generators/core-package.generator.ts");
const {
  registerCompositionRootGenerator,
} = require("./generators/composition-root.generator.ts");
const {
  registerInfrastructurePackageGenerator,
} = require("./generators/infrastructure-package.generator.ts");
const {
  registerCapabilitiesGenerator,
} = require("./generators/capabilities.generator.ts");
const {
  registerPrimitiveGenerator,
} = require("./generators/primitive.generator.ts");
const { registerShapeGenerator } = require("./generators/shape.generator.ts");
const { registerProofGenerator } = require("./generators/proof.generator.ts");
const { registerPortGenerator } = require("./generators/port.generator.ts");
const {
  registerUiPackageGenerator,
} = require("./generators/ui-package.generator.ts");
const {
  registerUseCaseGenerator,
} = require("./generators/use-case.generator.ts");
const {
  registerDomainErrorGenerator,
} = require("./generators/domain-error.generator.ts");
const {
  registerSyncTsconfigReferencesAction,
} = require("./common/tsconfig-references.utils.ts");

module.exports = function configurePlop(plop) {
  registerSyncTsconfigReferencesAction(plop);
  registerZodVersionHelper(plop);
  registerXndrjsVersionHelper(plop);
  registerCorePackageGenerator(plop);
  registerCompositionRootGenerator(plop);
  registerInfrastructurePackageGenerator(plop);
  registerUiPackageGenerator(plop);
  registerShapeGenerator(plop);
  registerPrimitiveGenerator(plop);
  registerProofGenerator(plop);
  registerCapabilitiesGenerator(plop);
  registerPortGenerator(plop);
  registerUseCaseGenerator(plop);
  registerDomainErrorGenerator(plop);
};
