import { ProxyCreation } from "../generated/SafeProxyFactory/SafeProxyFactory";
import {
  AddedOwner,
  RemovedOwner,
  ChangedThreshold,
  EnabledModule,
  ExecutionSuccess,
  ExecutionFailure,
  SafeSetup,
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
import { BigInt, Bytes, log, Address } from "@graphprotocol/graph-ts";
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
  let safeId = event.address.toHexString();
  let safe = Safe.load(safeId);

  // Ensure Safe and Lockler entities exist (backup creation)
  if (safe == null) {
    log.warning("Safe entity {} not found during handleEnabledModule. Creating now.", [safeId]);
    safe = new Safe(safeId);
    safe.nonce = BigInt.fromI32(0);
    safe.threshold = BigInt.fromI32(1); // Default, will be updated by SafeSetup
    safe.domainSeparator = getDomainSeparator(event.address);
    safe.createdAt = event.block.timestamp;
    safe.createdAtBlock = event.block.number;
    safe.owners = [];
    safe.modules = [];
    safe.signedMessages = [];
  }

  let lockler = Lockler.load(safeId);
  if (lockler == null) {
    log.warning("Lockler entity {} not found during handleEnabledModule. Creating now.", [safeId]);
    lockler = new Lockler(safeId);
    lockler.safe = safe.id;
    lockler.threshold = BigInt.fromI32(1); // Default, will be updated by SafeSetup
    lockler.transactionCount = BigInt.fromI32(0);
    lockler.createdAt = event.block.timestamp;
    lockler.createdAtBlock = event.block.number;
    lockler.creator = Bytes.fromHexString("0x0000000000000000000000000000000000000000"); // Placeholder, ProxyCreation is primary source
    lockler.owners = [];
    lockler.save(); // Save Lockler first if newly created
  }

  // Add the module to the Safe's list
  let modules = safe.modules; // modules will be non-null if safe exists
  if (modules.indexOf(event.params.module) == -1) { // Avoid duplicates
      modules.push(event.params.module);
      safe.modules = modules;
  }
  safe.save(); // Save Safe (either existing or newly created/updated)

  // Instantiate the RealityModule template for the enabled module
  RealityModuleTemplate.create(event.params.module);
  log.info("Instantiated RealityModule template for module {} enabled on Safe {}", [
      event.params.module.toHexString(),
      safeId
  ]);
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
  let ownerAddress = event.params.owner.toHexString(); // Safe address is the Lockler ID
  let moduleAddress = event.address.toHexString(); // Module address is the RealityModule ID
  let initiatorAddress = event.params.initiator; // Creator in this context

  log.info(
    "handleRealityModuleSetup triggered for module {} owned by {}", 
    [moduleAddress, ownerAddress]
  );
  
  // Attempt to load the Lockler
  let lockler = Lockler.load(ownerAddress);

  // If the Lockler doesn't exist, create it AND the associated Safe entity
  if (lockler == null) {
    log.warning(
      "Lockler entity {} not found during handleRealityModuleSetup. Creating now. (ProxyCreation likely processed later)",
      [ownerAddress]
    );

    // Create Safe entity first (required by Lockler.safe)
    let safe = new Safe(ownerAddress);
    safe.nonce = BigInt.fromI32(0);
    safe.threshold = BigInt.fromI32(1); // Default, Setup/Events will update later
    safe.domainSeparator = getDomainSeparator(event.params.owner); // Use owner address
    safe.createdAt = event.block.timestamp;
    safe.createdAtBlock = event.block.number;
    safe.owners = [];
    safe.modules = [];
    safe.signedMessages = [];
    safe.save();

    // Now create the Lockler entity
    lockler = new Lockler(ownerAddress);
    lockler.safe = safe.id; // Link to the just created Safe
    lockler.threshold = safe.threshold; // Match default
    lockler.transactionCount = BigInt.fromI32(0);
    lockler.createdAt = event.block.timestamp;
    lockler.createdAtBlock = event.block.number;
    lockler.creator = initiatorAddress; // Use initiator from this event
    lockler.owners = [];
    lockler.save();
  }

  // Now, Lockler entity is guaranteed to exist (either loaded or created)
  // Create the RealityModule entity
  let realityModule = new RealityModule(moduleAddress);
  realityModule.lockler = lockler.id; // Link to the existing Lockler
  realityModule.owner = event.params.owner;
  realityModule.avatar = event.params.avatar;
  realityModule.target = event.params.target;
  realityModule.createdAt = event.block.timestamp;
  realityModule.createdAtBlock = event.block.number;
  
  log.info("Saving RealityModule {} linked to Lockler {}", [moduleAddress, lockler.id]);
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

// Handle Safe setup event
export function handleSafeSetup(event: SafeSetup): void {
  let safeId = event.address.toHexString();
  log.info("Handling SafeSetup for Safe: {}", [safeId]);

  let safe = Safe.load(safeId);
  if (safe == null) {
    log.warning(
      "Safe entity not found during SafeSetup for address: {}. Was ProxyCreation missed or processed later?", 
      [safeId]
    );
    return; 
  }

  // Convert owners from Address[] to Bytes[]
  let ownersFromEvent = event.params.owners; // Array<Address>
  let ownersAsBytes = ownersFromEvent.map<Bytes>((ownerAddress: Address): Bytes => {
      return ownerAddress as Bytes; // Cast Address to Bytes
  });

  // Update Safe entity with initial owners (as Bytes) and threshold
  safe.owners = ownersAsBytes;
  safe.threshold = event.params.threshold;
  safe.save();

  // Also update the corresponding Lockler entity
  let lockler = Lockler.load(safeId);
  if (lockler != null) {
    lockler.owners = ownersAsBytes; // Use the converted Bytes array
    lockler.threshold = event.params.threshold;
    lockler.save();
    log.info("Updated Lockler {} owners and threshold from SafeSetup", [safeId]);
  } else {
    log.warning(
      "Lockler entity not found during SafeSetup for Safe address: {}. This shouldn't happen if ProxyCreation worked.",
      [safeId]
    );
  }
}
