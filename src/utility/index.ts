import _ from "lodash";
export * from "./logger";

export const snakeCaseKeys = (objClass: any) => {
  if (_.isDate(objClass) || _.isObject(objClass) == false) {
    return objClass;
  }

  function serialize(item: any) {
    let result: any = {};

    _.map(item, (prop_value, prop_name) => {
      if (_.isArray(prop_value)) {
        result[_.snakeCase(prop_name)] = _.map(prop_value, (item) => {
          return snakeCaseKeys(item);
        });
      } else if (_.isDate(prop_value)) {
        result[_.snakeCase(prop_name)] = prop_value;
      } else if (_.isObject(prop_value)) {
        result[_.snakeCase(prop_name)] = snakeCaseKeys(prop_value);
      } else {
        result[_.snakeCase(prop_name)] = prop_value;
      }
    });

    return result;
  }

  if (_.isArray(objClass)) {
    return _.map(objClass, (item) => serialize(item));
  } else {
    return serialize(objClass);
  }
};
