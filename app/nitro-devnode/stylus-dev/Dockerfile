ARG NITRO_NODE_VERSION
FROM offchainlabs/nitro-node:$NITRO_NODE_VERSION AS nitro-node-stylus-dev
USER root
RUN apt-get update && \
    apt-get install -y git python3 make g++ curl pkg-config libssl-dev
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.91.0
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup target add x86_64-unknown-linux-gnu wasm32-unknown-unknown wasm32-wasip1
RUN curl -L https://foundry.paradigm.xyz | bash && . ~/.bashrc && ~/.foundry/bin/foundryup
ENV PATH="/root/.foundry/bin:${PATH}"
RUN cargo install --force --locked cargo-stylus@0.10.8
