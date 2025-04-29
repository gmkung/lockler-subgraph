# Lockler Subgraph

This subgraph indexes events from the Lockler protocol's DeterministicDeploymentHelper contract and its deployed RealityModule contracts. It tracks Safe deployments, Reality Module deployments, and their associated events and parameters.

## Overview

The subgraph tracks:
- Safe proxy deployments through the Safe Proxy Factory
- Reality Module deployments and their associations with Safes
- Key parameters and events from both contract types

## Schema

The main entities tracked are:

- `Safe`: Represents a deployed Safe contract
  - Tracks the proxy address, owner addresses, and associated Reality Modules
  - Records creation timestamp and transaction details

- `RealityModule`: Represents a deployed Reality Module contract
  - Links to its parent Safe
  - Stores configuration parameters and state
  - Tracks events and interactions

## Development Setup

1. Install dependencies:
```bash
yarn install
```

2. Generate types:
```bash
yarn codegen
```

3. Build the subgraph:
```bash
yarn build
```

## Deployment

To deploy the subgraph to The Graph's hosted service:

```bash
graph auth --product hosted-service <ACCESS_TOKEN>
graph deploy --node https://api.thegraph.com/deploy/ <GITHUB_USER>/lockler-subgraph
```

## Querying

Once deployed, you can query the subgraph using GraphQL. Here's an example query:

```graphql
{
  safes(first: 5) {
    id
    owners
    realityModules {
      id
      configuration
    }
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. 