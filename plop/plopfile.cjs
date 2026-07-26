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
  registerInfrastructureLoaderGenerator,
} = require("./generators/infrastructure-loader.generator.ts");
const {
  registerInfrastructureRepositoryGenerator,
} = require("./generators/infrastructure-repository.generator.ts");
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
  // Helpers
  registerSyncTsconfigReferencesAction(plop);
  registerZodVersionHelper(plop);
  registerXndrjsVersionHelper(plop);

  // Core generators
  registerCorePackageGenerator(plop);
  registerPrimitiveGenerator(plop);
  registerShapeGenerator(plop);
  registerCapabilitiesGenerator(plop);
  registerProofGenerator(plop);
  registerPortGenerator(plop);
  registerUseCaseGenerator(plop);
  registerDomainErrorGenerator(plop);

  // Infrastructure generators
  registerInfrastructurePackageGenerator(plop);
  registerInfrastructureLoaderGenerator(plop);
  registerInfrastructureRepositoryGenerator(plop);

  // Composition generators
  registerCompositionRootGenerator(plop);

  // UI generators
  registerUiPackageGenerator(plop);
};
