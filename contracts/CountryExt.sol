pragma solidity 0.4.23;

import "./CountryERC721.sol";

/**
 * @title Country ERC721 Extension
 *
 * @notice Extends CountryERC721 smart contract by providing
 *      a convenient way to obtain information about all countries
 *      in a single function call
 *
 * @author Basil Gorin
 */
contract CountryExt {
  /**
   * @dev Expected version of the deployed CountryERC721 instance
   *      this smart contract is designed to work with
   */
  uint32 public constant COUNTRY_TOKEN_VERSION_REQUIRED = 0x1;

  /**
   * @dev CountryERC721 deployed instance this smart contract extends
   */
  CountryERC721 public country;

  /**
   * @dev Creates Country ERC721 Extension, binding it to the already deployed
   *      CountryERC721 instance
   * @dev Throws if country instance specified doesn't exist or has wrong version
   * @param _country address of the deployed CountryERC721 instance
   */
  constructor(address _country) public {
    // verify the input: mistake in country address
    require(_country != address(0));

    // bind CountryERC721 smart contract instance
    country = CountryERC721(_country);

    // verify CountryERC721 smart contract version
    require(country.TOKEN_VERSION() == COUNTRY_TOKEN_VERSION_REQUIRED);
  }

  /**
   * @dev Iterates over all 192 (max) possible countries defined in
   *      CountryERC721 instance this smart contract is bound to,
   *      fetching country owner, number of plots, tax and tax modified date,
   *      and assembled result of the iteration into array
   * @dev The resulting array is ordered by country id, meaning element at
   *      index `i` contains country with an ID `i + 1`
   * @dev The resulting array contains packed data structures for each country, containing:
   *      * number of plots as an integer, 16 bits
   *      * tax rate as a 16 bit fraction, 16 bits
   *      * country owner address as an integer, 160 bits
   * @dev note: country owner address may be zero meaning country is not owned
   * @return an ordered array of countries as packed data structures
   */
  function getAllCountriesPacked() public constant returns(uint192[]) {
    // determine how many countries we may have minted
    uint8 n = country.getNumberOfCountries();

    // define resulting array in memory
    uint192[] memory result = new uint192[](n);

    // iterate over all possible countries CountryERC721 may have minted
    for(uint8 i = 0; i < n; i++) {
      // if country is already minted and belongs to someone
      if(country.exists(i + 1)) {
        // build the result from actual country data
        result[i] = uint192(country.getPacked(i + 1)) << 160 | uint160(country.ownerOf(i + 1));
      }
      // otherwise, if country was not yet minted
      else {
        // build the result from country initialization data
        result[i] = uint192(country.countryData(i)) << 176 | uint176(country.DEFAULT_TAX_RATE()) << 160;
      }
    }

    // return the resulting array
    return result;
  }

}
