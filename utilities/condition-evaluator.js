function evaluate(data, filter) {
  // If no filters, return true
  if (!filter || !Array.isArray(filter) || filter.length === 0) {
    return true;
  }

  // Check if data passes all filter conditions (implicit AND)
  return filter.every((condition) => evaluateCondition(data, condition));
}

function evaluateCondition(data, condition) {
  const { field, operation, value } = condition;

  // If field doesn't exist in data, return false
  if (!(field in data)) {
    return false;
  }

  const fieldValue = data[field];

  switch (operation) {
    case '=':
      return fieldValue === value;
    case '!=':
      return fieldValue !== value;
    case '>':
      return parseFloat(fieldValue) > parseFloat(value);
    case '>=':
      return parseFloat(fieldValue) >= parseFloat(value);
    case '<':
      return parseFloat(fieldValue) < parseFloat(value);
    case '<=':
      return parseFloat(fieldValue) <= parseFloat(value);
    case 'STARTSWITH':
      return typeof fieldValue === 'string' && fieldValue.startsWith(value);
    case 'ENDSWITH':
      return typeof fieldValue === 'string' && fieldValue.endsWith(value);
    case 'CONTAINS':
      return typeof fieldValue === 'string' && fieldValue.includes(value);
    case 'EQUALS':
      return typeof fieldValue === 'string' && fieldValue.trim() === value;
    case 'IN':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'BETWEEN':
      if (Array.isArray(value) && value.length === 2) {
        const numValue = parseFloat(fieldValue);
        return numValue >= parseFloat(value[0]) && numValue <= parseFloat(value[1]);
      }
      return false;
    case 'REGEX':
      try {
        const regex = new RegExp(value);
        return regex.test(String(fieldValue));
      } catch (e) {
        console.error(`Invalid regex pattern: ${value}`);
        return false;
      }
    default:
      console.warn(`Unknown operation: ${operation}`);
      return false;
  }
}

/**
 * Exports the main evaluate function
 */
export default {
  evaluate,
};
