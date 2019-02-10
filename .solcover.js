// https://www.npmjs.com/package/solidity-coverage
module.exports = {
	accounts: 20,
	testrpcOptions: "--defaultBalanceEther=1000 --defaultBalanceEther=1000 --gasPrice=1 --gasLimit=0xfffffffffff",
/*
	testCommand: 'ganache-cli --defaultBalanceEther=1000 --gasPrice=1 --gasLimit=0xfffffffffff --port=8555 --accounts=20 > /tmp/testrpc.log 2>&1 & truffle test --network=coverage $1',
	norpc: true,
*/
};
