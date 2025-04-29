import { ProxyCreation } from "../generated/SafeProxyFactory/SafeProxyFactory";
import {
  AddedOwner,
  RemovedOwner,
  ChangedThreshold,
  EnabledModule,
  ExecutionSuccess,
  ExecutionFailure,
} from "../generated/templates/Safe/Safe";
import {
  RealityModuleSetup,
  ProposalQuestionCreated,
} from "../generated/templates/RealityModule/RealityModule";
import {
  Lockler,
  Safe,
  SafeTransaction,
  RealityModule,
} from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

// Helper function to get domain separator
function getDomainSeparator(safeAddress: Bytes): Bytes {
  // Implementation depends on how we can get the domain separator
  // This might need to be implemented differently
  return Bytes.fromHexString("0x");
}

// Handle new Safe creation
export function handleProxyCreation(event: ProxyCreation): void {
  let safe = new Safe(event.params.proxy.toHexString());
  safe.nonce = BigInt.fromI32(0);
  safe.domainSeparator = getDomainSeparator(event.params.proxy);
  safe.createdAt = event.block.timestamp;
  safe.createdAtBlock = event.block.number;
  safe.save();

  let lockler = new Lockler(event.params.proxy.toHexString());
  lockler.safe = safe.id;
  lockler.transactionCount = BigInt.fromI32(0);
  lockler.createdAt = event.block.timestamp;
  lockler.createdAtBlock = event.block.number;
  lockler.creator = event.transaction.from;
  lockler.save();
}

// Handle owner addition
export function handleAddedOwner(event: AddedOwner): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    let owners = safe.owners;
    owners.push(event.params.owner);
    safe.owners = owners;
    safe.save();

    let lockler = Lockler.load(event.address.toHexString());
    if (lockler) {
      let locklerOwners = lockler.owners;
      locklerOwners.push(event.params.owner);
      lockler.owners = locklerOwners;
      lockler.save();
    }
  }
}

// Handle owner removal
export function handleRemovedOwner(event: RemovedOwner): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    let owners = safe.owners;
    let index = owners.indexOf(event.params.owner);
    if (index > -1) {
      owners.splice(index, 1);
      safe.owners = owners;
      safe.save();

      let lockler = Lockler.load(event.address.toHexString());
      if (lockler) {
        let locklerOwners = lockler.owners;
        locklerOwners.splice(index, 1);
        lockler.owners = locklerOwners;
        lockler.save();
      }
    }
  }
}

// Handle threshold change
export function handleChangedThreshold(event: ChangedThreshold): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    safe.threshold = event.params.threshold;
    safe.save();

    let lockler = Lockler.load(event.address.toHexString());
    if (lockler) {
      lockler.threshold = event.params.threshold;
      lockler.save();
    }
  }
}

// Handle module enablement
export function handleEnabledModule(event: EnabledModule): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    let modules = safe.modules;
    modules.push(event.params.module);
    safe.modules = modules;
    safe.save();

    // Check if this is a Reality Module by checking for RealityModuleSetup event
    // This would need to be implemented based on how we can identify Reality Modules
  }
}

// Handle transaction execution
export function handleExecutionSuccess(event: ExecutionSuccess): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    safe.nonce = safe.nonce.plus(BigInt.fromI32(1));
    safe.save();

    let lockler = Lockler.load(event.address.toHexString());
    if (lockler) {
      lockler.transactionCount = lockler.transactionCount.plus(
        BigInt.fromI32(1)
      );
      lockler.save();
    }
  }
}

// Handle transaction failure
export function handleExecutionFailure(event: ExecutionFailure): void {
  // Similar to handleExecutionSuccess but mark transaction as failed
}

// Handle Reality Module setup
export function handleRealityModuleSetup(event: RealityModuleSetup): void {
  let module = new RealityModule(event.address.toHexString());
  module.owner = event.params.owner;
  module.avatar = event.params.avatar;
  module.target = event.params.target;
  module.createdAt = event.block.timestamp;
  module.createdAtBlock = event.block.number;

  // Link to Lockler
  let lockler = Lockler.load(event.params.avatar.toHexString());
  if (lockler) {
    module.lockler = lockler.id;
  }

  module.save();
}

// Handle proposal question creation
export function handleProposalQuestionCreated(
  event: ProposalQuestionCreated
): void {
  let module = RealityModule.load(event.address.toHexString());
  if (module) {
    // Store the question text or other relevant data
    module.questionText = event.params.proposalId.toString();
    module.save();
  }
}
