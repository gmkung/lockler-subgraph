import { ProxyCreation } from "../generated/SafeProxyFactory/SafeProxyFactory";
import {
  AddedOwner,
  RemovedOwner,
  ChangedThreshold,
  EnabledModule,
  ExecutionSuccess,
  ExecutionFailure,
  Safe as SafeContract, // Renamed to avoid conflict with Safe entity
} from "../generated/templates/Safe/Safe";
import {
  RealityModuleSetup,
  ProposalQuestionCreated,
  RealityModule as RealityModuleContract, // Renamed
} from "../generated/templates/RealityModule/RealityModule";
import {
  Lockler,
  Safe,
  SafeTransaction,
  RealityModule,
} from "../generated/schema";
import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  Safe as SafeTemplate,
  RealityModule as RealityModuleTemplate,
} from "../generated/templates"; // Import templates

// Helper function to get domain separator
function getDomainSeparator(safeAddress: Bytes): Bytes {
  // Implementation depends on how we can get the domain separator
  // This might need to be implemented differently
  return Bytes.fromHexString("0x");
}

// Handle new Safe creation
export function handleProxyCreation(event: ProxyCreation): void {
  // Create Safe entity
  let safe = new Safe(event.params.proxy.toHexString());
  safe.nonce = BigInt.fromI32(0);
  safe.threshold = BigInt.fromI32(1);
  safe.domainSeparator = getDomainSeparator(event.params.proxy);
  safe.createdAt = event.block.timestamp;
  safe.createdAtBlock = event.block.number;
  safe.owners = [];
  safe.modules = [];
  safe.signedMessages = [];
  safe.save();

  // Create Lockler entity
  let lockler = new Lockler(event.params.proxy.toHexString());
  lockler.safe = safe.id;
  lockler.threshold = BigInt.fromI32(1);
  lockler.transactionCount = BigInt.fromI32(0);
  lockler.createdAt = event.block.timestamp;
  lockler.createdAtBlock = event.block.number;
  lockler.creator = event.transaction.from;
  lockler.owners = [];
  lockler.save();

  // Instantiate the Safe template to start listening to events from this new Safe
  SafeTemplate.create(event.params.proxy);
}

// Handle owner addition
export function handleAddedOwner(event: AddedOwner): void {
  let safeId = event.address.toHexString();
  let safe = Safe.load(safeId);
  if (safe) {
    // Create a new array with existing owners + new owner
    let newOwners = safe.owners;
    newOwners.push(event.params.owner);
    safe.owners = newOwners; // Assign the new array
    safe.save();

    let lockler = Lockler.load(safeId);
    if (lockler) {
      lockler.owners = newOwners; // Assign the same new array
      lockler.save();
    }
  }
}

// Handle owner removal
export function handleRemovedOwner(event: RemovedOwner): void {
  let safeId = event.address.toHexString();
  let safe = Safe.load(safeId);
  if (safe) {
    let ownerToRemove = event.params.owner.toHexString();
    let currentOwners = safe.owners;
    let newOwners: Bytes[] = [];
    for (let i = 0; i < currentOwners.length; i++) {
      if (currentOwners[i].toHexString() != ownerToRemove) {
        newOwners.push(currentOwners[i]);
      }
    }
    safe.owners = newOwners; // Assign the new filtered array
    safe.save();

    let lockler = Lockler.load(safeId);
    if (lockler) {
      lockler.owners = newOwners; // Assign the same new filtered array
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

    // Instantiate the RealityModule template for the enabled module
    RealityModuleTemplate.create(event.params.module);
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
  log.info(
    "handleRealityModuleSetup triggered for module {} owned by {}", 
    [event.address.toHexString(), event.params.owner.toHexString()]
  );
  // Load the Lockler using the owner address (which is the Safe address)
  let lockler = Lockler.load(event.params.owner.toHexString());

  // If the Lockler doesn't exist yet, log an error and return.
  // It should have been created by handleProxyCreation first.
  if (lockler == null) {
    log.error(
      "Lockler entity not found for owner (Safe) address: {}. RealityModuleSetup event processed before ProxyCreation?",
      [event.params.owner.toHexString()]
    );
    return;
  }

  // Create the RealityModule entity using the module's address as its ID
  let realityModuleId = event.address.toHexString();
  let realityModule = new RealityModule(realityModuleId);
  realityModule.lockler = lockler.id; // Link to the existing Lockler
  realityModule.owner = event.params.owner;
  realityModule.avatar = event.params.avatar;
  realityModule.target = event.params.target;
  realityModule.createdAt = event.block.timestamp;
  realityModule.createdAtBlock = event.block.number;
  
  log.info("Saving RealityModule {} linked to Lockler {}", [realityModuleId, lockler.id]);
  realityModule.save(); // Save the new RealityModule
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
