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
  safe.threshold = BigInt.fromI32(1); // Set default threshold to 1
  safe.domainSeparator = getDomainSeparator(event.params.proxy);
  safe.createdAt = event.block.timestamp;
  safe.createdAtBlock = event.block.number;
  safe.owners = [event.transaction.from]; // Add creator as first owner
  safe.modules = [];
  safe.signedMessages = [];
  safe.save();

  let lockler = new Lockler(event.params.proxy.toHexString());
  lockler.safe = safe.id;
  lockler.threshold = BigInt.fromI32(1); // Set default threshold to 1
  lockler.transactionCount = BigInt.fromI32(0);
  lockler.createdAt = event.block.timestamp;
  lockler.createdAtBlock = event.block.number;
  lockler.creator = event.transaction.from;
  lockler.owners = [];
  lockler.save();
}

// Handle owner addition
export function handleAddedOwner(event: AddedOwner): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    let owners = safe.owners;
    // Create a new array with the new owner
    let newOwners = new Array<Bytes>(owners.length + 1);
    for (let i = 0; i < owners.length; i++) {
      newOwners[i] = owners[i];
    }
    newOwners[owners.length] = event.params.owner;
    safe.owners = newOwners;
    safe.save();

    // Also update the Lockler entity
    let lockler = Lockler.load(event.address.toHexString());
    if (lockler) {
      lockler.owners = newOwners;
      lockler.save();
    }
  }
}

// Handle owner removal
export function handleRemovedOwner(event: RemovedOwner): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    let owners = safe.owners;
    // Create a new array without the removed owner
    let newOwners = new Array<Bytes>(owners.length - 1);
    let newIndex = 0;
    for (let i = 0; i < owners.length; i++) {
      if (owners[i] != event.params.owner) {
        newOwners[newIndex] = owners[i];
        newIndex++;
      }
    }
    safe.owners = newOwners;
    safe.save();

    // Also update the Lockler entity
    let lockler = Lockler.load(event.address.toHexString());
    if (lockler) {
      lockler.owners = newOwners;
      lockler.save();
    }
  }
}

// Handle threshold change
export function handleChangedThreshold(event: ChangedThreshold): void {
  let safe = Safe.load(event.address.toHexString());
  if (safe) {
    safe.threshold = event.params.threshold;
    safe.save();

    // Also update the Lockler entity
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
  let lockler = Lockler.load(event.params.owner.toHexString());
  if (lockler == null) {
    lockler = new Lockler(event.params.owner.toHexString());
    lockler.save();
  }

  let realityModule = new RealityModule(event.params.avatar.toHexString());
  realityModule.lockler = lockler.id;
  realityModule.owner = event.params.owner;
  realityModule.avatar = event.params.avatar;
  realityModule.target = event.params.target;
  realityModule.createdAt = event.block.timestamp;
  realityModule.createdAtBlock = event.block.number;
  realityModule.save();
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
