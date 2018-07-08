pragma solidity 0.4.23;

// Chest vault accumulates some value, locking it for a 3 months period of time
contract ChestVault {
  // first owner of the vault
  address public owner1;

  // second owner of the vault
  address public owner2;

  // a timestamp when the vault unlocks the funds it contains
  uint256 public unlockTime;

  // when `owner1` calls a `withdraw` this address is set
  address private to1;

  // when `owner2` calls a `withdraw` this address is set
  address private to2;

  // logs all the payments received
  event PaymentReceived(address indexed from, uint256 amount);

  // logs a successful withdrawal
  event FundsWithdrawn(address indexed to, uint256 amount);

  // A vault is controlled by 2 addresses requiring both 2 votes for consensus
  constructor(address _owner1, address _owner2) public {
    // check inputs
    require(_owner1 != address(0));
    require(_owner2 != address(0));
    require(_owner1 != _owner2);

    // setup the vault
    owner1 = _owner1;
    owner2 = _owner2;
    
    // unlock the vault in 90 days from now
    unlockTime = now + 90 days;
  }

  // a function to withdraw funds, available to use only
  // after 3 months after the deployment of the contract
  // both owners consensus required
  function withdraw(address to) public {
    // input validation
    require(to != address(0));

    // check sender gracefully – `caller`
    address caller = msg.sender;

    // how much do we have on the balance
    uint256 balance = address(this).balance;

    // there should be something to withdraw
    require(balance > 0);

    // check that 3 months has passed
    require(now > unlockTime);

    // check the permissions
    require(caller == owner1 && to != to1 || caller == owner2 && to != to2);

    // we're all set and consensus is reached, proceed with the withdraw
    if(caller == owner1 && to2 == to || caller == owner2 && to1 == to) {
      // update state variables first
      to1 = address(0);
      to2 = address(0);

      // transfer the funds
      to.transfer(balance);

      // emit an event
      emit FundsWithdrawn(to, balance);
    }
    // remember call from `owner1`
    else if(caller == owner1) {
      // set the `to1`
      to1 = to;
    }
    // or remember call from `owner1`
    else if(caller == owner2) {
      // set the `to2`
      to2 = to;
    }
  }

  // revoke the withdraw, cancels pending withdraw request
  function revoke() public {
    // check sender gracefully – `caller`
    address caller = msg.sender;

    // check that 3 months has passed
    require(now > unlockTime);

    // check the permissions
    require(caller == owner1 && to1 != address(0) || caller == owner2 && to2 != address(0));

    // revoke – set correspondent address (`to1/to2`) to zero
    if(caller == owner1) {
      // set `to1` to zero
      to1 = address(0);
    }
    else if(caller == owner2) {
      // set `to2` to zero
      to2 = address(0);
    }
  }

  // smart contract accepts payments
  function() public payable {
    // only log an event, keep default function simple
    emit PaymentReceived(msg.sender, msg.value);
  }
}
