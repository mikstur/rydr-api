'use strict';

class BaseDao {

    /**
     *This method initializes the DAO
     *
     * @dataSource -The DataSource
     */
  constructor(dataSource) {
    this.dataSource = dataSource;
  }

}

module.exports = BaseDao;
