#!/usr/bin/env bash

# rm -rf build
testrpc --gasPrice=20 --port=8666 --accounts=20 > /tmp/testrpc.log 2>&1 &
truffle test --network=test
kill -9 `ps -ef | grep 'port=8666' | grep testrpc | awk '{print \$2}'`

