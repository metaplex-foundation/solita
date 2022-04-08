# solita [![Build Lint and Test Solita](https://github.com/metaplex-foundation/solita/actions/workflows/solita.yml/badge.svg)](https://github.com/metaplex-foundation/solita/actions/workflows/solita.yml)

**Sol** ana **I** DL **t** o **A** PI generator.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [How does it Work?](#how-does-it-work)
- [Shank + Solita Example](#shank--solita-example)
  - [Metaplex Program Library Token Metadata Solita + Shank Setup](#metaplex-program-library-token-metadata-solita--shank-setup)
- [Anchor + Solita Example](#anchor--solita-example)
  - [Metaplex Program Library Token Metadata Solita + Anchor Setup](#metaplex-program-library-token-metadata-solita--anchor-setup)
- [Solita in the Wild](#solita-in-the-wild)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## How does it Work?

_Solita_ generates a low level TypeScript SDK for your _Solana_ Rust programs from the [IDL](https://en.wikipedia.org/wiki/Interface_description_language) extracted by
[anchor](https://github.com/project-serum/anchor) or
[shank](https://github.com/metaplex-foundation/shank).

## Shank + Solita Example

In order to use _solita_ with shank do the following:

- globally install `shank` via `cargo install shank-cli`
- add the `shank` library to your Rust project via `cargo add shank`
- annotate your Rust program as outlined [here](https://docs.rs/crate/shank_macro/latest)
- add `solita` to the dev dependencies of your SDK package via `yarn add -D @metaplex-foundation/solita`
- add a script similar to the below to your SDK package and run it each time you make a change
  to your program to generate the TypeScript SDK

```js
const path = require('path');
const programDir = path.join(__dirname, '..', '..', 'program');
const generatedIdlDir = path.join(__dirname, '..', 'idl');
const generatedSDKDir = path.join(__dirname, '..', 'src', 'generated');
const PROGRAM_NAME = 'mpl_token_metadata';
const { Solita } = require('@metaplex-foundation/solita');
const { spawn } = require('child_process');

const shank = spawn('shank', ['idl', '--out-dir', generatedIdlDir, '--crate-root', programDir])
  .on('error', (err) => {
    console.error(err);
    if (err.code === 'ENOENT') {
      console.error(
        'Ensure that `shank` is installed and in your path, see:\n  https://github.com/metaplex-foundation/shank\n',
      );
    }
    process.exit(1);
  })
  .on('exit', () => {
    generateTypeScriptSDK();
  });

shank.stdout.on('data', (buf) => console.log(buf.toString('utf8')));
shank.stderr.on('data', (buf) => console.error(buf.toString('utf8')));

async function generateTypeScriptSDK() {
  console.error('Generating TypeScript SDK to %s', generatedSDKDir);
  const generatedIdlPath = path.join(generatedIdlDir, `${PROGRAM_NAME}.json`);

  const idl = require(generatedIdlPath);
  const gen = new Solita(idl, { formatCode: true });
  await gen.renderAndWriteTo(generatedSDKDir);

  console.error('Success!');

  process.exit(0);
}
```

### Metaplex Program Library Token Metadata Solita + Shank Setup

- [annotated instructions](https://github.com/metaplex-foundation/metaplex-program-library/blob/5f0c0656ff250f7a70643c06306962186f37ef5d/token-metadata/program/src/instruction.rs#L80)
- [annotated accounts](https://github.com/metaplex-foundation/metaplex-program-library/blob/master/token-metadata/program/src/state.rs#L194)
- [generated TypeScript](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/token-metadata/js/src/generated)

## Anchor + Solita Example

In order to use _solita_ with anchor do the following:

- globally [install anchor](https://book.anchor-lang.com/chapter_2/installation.html)
- annotate your Rust program with anchor attributes 
- add `solita` to the dev dependencies of your SDK package via `yarn add -D @metaplex-foundation/solita`
- add a script similar to the below to your SDK package and run it each time you make a change
  to your program to generate the TypeScript SDK

```js
const PROGRAM_NAME = 'candy_machine';
const PROGRAM_ID = 'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ';

const path = require('path');
const programDir = path.join(__dirname, '..', '..', 'program');
const generatedIdlDir = path.join(__dirname, '..', 'idl');
const generatedSDKDir = path.join(__dirname, '..', 'src', 'generated');
const { spawn } = require('child_process');
const { Solita } = require('@metaplex-foundation/solita');
const { writeFile } = require('fs/promises');

const anchor = spawn('anchor', ['build', '--idl', generatedIdlDir], { cwd: programDir })
  .on('error', (err) => {
    console.error(err);
    // @ts-ignore this err does have a code
    if (err.code === 'ENOENT') {
      console.error(
        'Ensure that `anchor` is installed and in your path, see:\n  https://project-serum.github.io/anchor/getting-started/installation.html#install-anchor\n',
      );
    }
    process.exit(1);
  })
  .on('exit', () => {
    console.log('IDL written to: %s', path.join(generatedIdlDir, `${PROGRAM_NAME}.json`));
    generateTypeScriptSDK();
  });

anchor.stdout.on('data', (buf) => console.log(buf.toString('utf8')));
anchor.stderr.on('data', (buf) => console.error(buf.toString('utf8')));

async function generateTypeScriptSDK() {
  console.error('Generating TypeScript SDK to %s', generatedSDKDir);
  const generatedIdlPath = path.join(generatedIdlDir, `${PROGRAM_NAME}.json`);

  const idl = require(generatedIdlPath);
  if (idl.metadata?.address == null) {
    idl.metadata = { ...idl.metadata, address: PROGRAM_ID };
    await writeFile(generatedIdlPath, JSON.stringify(idl, null, 2));
  }
  const gen = new Solita(idl, { formatCode: true });
  await gen.renderAndWriteTo(generatedSDKDir);

  console.error('Success!');

  process.exit(0);
}
```

### Metaplex Program Library Token Metadata Solita + Anchor Setup
  
- [annotated anchor program](https://github.com/metaplex-foundation/metaplex-program-library/blob/5f0c0656ff250f7a70643c06306962186f37ef5d/candy-machine/program/src/lib.rs) 
- [generated TypeScript](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/candy-machine/js/src/generated)

## Solita in the Wild

Find more _solita_, _shank_ and _anchor_  examples inside the
[metaplex-program-library](https://github.com/metaplex-foundation/metaplex-program-library).

## LICENSE

Apache-2.0
