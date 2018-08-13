#!/usr/bin/env bash

geth \
--rinkeby \
--light \
--rpc \
--rpcport 8544 \
--port 38544 \
--unlock ed6003e7a6494db4ababeb7bdf994a3951ac6e69 \
--password <(echo Welcome1)
