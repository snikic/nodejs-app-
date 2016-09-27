'use strict';

define(['state/data'], data => {
    const _searchComparator = (objectString, searchString) => {
        const searchStr = (searchString || '').toLowerCase();
        return String(objectString || '').toLowerCase().indexOf(searchStr) > -1;
    };

    const _objectSearch = (object, searchString) => {
        switch (typeof object) {
            case 'boolean':
            case 'number':
            case 'string':
                return _searchComparator(object, searchString);
            case 'object':
                return Object.keys(object).some(objectKey => _objectSearch(object[objectKey], searchString));
            case 'array':
                return object.some(arrayElement => _objectSearch(arrayElement, searchString));
            default:
                return false;
        }
    };

    const _initObjectSearch = (object, searchString) => {
        if (searchString.charAt(0) === '!') return !_objectSearch(object, searchString.substr(1));

        return _objectSearch(object, searchString);
    };

    const run = searchString => {
        if (searchString) {
            return data.getModules()
                .then(modules => {
                    const result = new Map(); // prevent duplicates
                    const searchParams = searchString.split(' ');
                    searchParams.forEach(searchParam => {
                        Object.keys(modules).forEach(moduleId => {
                            const module = modules[moduleId];
                            if (_initObjectSearch(module, searchParam)) result.set(module.id, module);
                        });
                    });
                    return Array.from(result.values());
                });
        }
        return Promise.resolve([]);
    };

    return {
        run // returns Promise
    };
});
