{
  description = "A flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-26.05";
    nixpkgs-unstable.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      nixpkgs-unstable,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        unstable = import nixpkgs-unstable {
          inherit system;
          config.allowUnfree = true;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          LD_LIBRARY_PATH =
            with pkgs;
            lib.makeLibraryPath [
              stdenv.cc.cc
              zlib
              glib
              libxcb
              libglvnd
            ];

          packages = pkgs.lib.flatten [
            (with pkgs; [
              nodejs
              pnpm
              foundry
              solc

              cargo
              rustc
              rustup
              openssl
              pkg-config
              lld
              binaryen
            ])
            (with unstable; [
            ])
          ];
          env = {
            RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
          };
          shellHook = ''
            export PATH="$PATH:$HOME/.cargo/bin:$HOME/.rustup/toolchains"
          '';
          buildInputs = [ pkgs.bashInteractive ];
        };
      }
    );
}
