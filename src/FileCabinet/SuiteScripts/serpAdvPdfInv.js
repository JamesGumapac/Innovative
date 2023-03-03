/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
 ​
 const MODULES = ['N/search'];
 ​
 define(MODULES, function(search) {
 ​
    function beforeLoad(context) {

         var type = context.type;
         var form = context.form;
         var rec = context.newRecord;

        log.debug('context', context);

        //get entity id
        var entityId = rec.getValue({
            fieldId: 'entity'
        });

        log.debug('entityId', entityId);

        if ((type == context.UserEventType.PRINT || type == context.UserEventType.EMAIL) && entityId) {

            var searchObj = search.create({
                type: "transaction",
                filters:
                [
                   ["accounttype","anyof","AcctRec"],
                   "AND",
                   ["posting","is","T"],
                   "AND",
                   ["amountremaining","notequalto","0.00"],
                   "AND",
                   ["customer.internalid","is",entityId],
                   "AND",
                    ["customermain.entityid","isnotempty",""]
                ],
                columns:
                [
                   search.createColumn({
                      name: "entity",
                      summary: "GROUP",
                      label: "Name"
                   }),
                   search.createColumn({
                      name: "formulacurrency",
                      summary: "SUM",
                      formula: "Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) < 1 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) < 1 then {amountremaining} else 0 end",
                      label: "CurrentOpenBalance"
                   }),
                   search.createColumn({
                      name: "formulacurrency",
                      summary: "SUM",
                      formula: "Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 1 and 30 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 1 and 30 then {amountremaining} else 0 end",
                      label: "days30"
                   }),
                   search.createColumn({
                      name: "formulacurrency",
                      summary: "SUM",
                      formula: "Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 31 and 60 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 31 and 60 then {amountremaining} else 0 end",
                      label: "days60"
                   }),
                   search.createColumn({
                      name: "formulacurrency",
                      summary: "SUM",
                      formula: "Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 61 and 90 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 61 and 90 then {amountremaining} else 0 end",
                      label: "days90"
                   }),
                   search.createColumn({
                      name: "formulacurrency",
                      summary: "SUM",
                      formula: "Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) > 90 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) > 90 then {amountremaining} else 0 end",
                      label: "morethan90Days"
                   }),
                   search.createColumn({
                      name: "amountremaining",
                      summary: "SUM",
                      label: "amountremaining"
                   })
                ]
            });

            /** DO NOT REMOVE THIS COMMENT FOR TROUBLESHOOTING*/
            // var searchObj = search.load({
            //     id: 'customsearch884',
            //     type: search.Type.CUSTOM_SEARCH
            // });

            // add filters
            // searchObj.filters.push(search.createFilter({
            //     name: "customer.internalid",
            //     operator: "anyof",
            //     values: entityId
            // }));
            /** DO NOT REMOVE THIS COMMENT FOR TROUBLESHOOTING*/

            log.debug('searchObj', searchObj);


            //run saved search
            var searchResult = searchObj.run();

            //get search results
            var resultSet = searchResult.getRange(0, 1);

            if (resultSet.length > 0) {

                var columns = searchResult.columns;
                var colObj = {}
                var colObj = columns.map(function (iter) {
                    colObj[iter.label] = iter
                    return colObj;
                })

                //get result
                var result = resultSet[0];
                log.debug('result values', result);

                var currentAging = result.getValue(colObj[0].CurrentOpenBalance);
                log.debug('currentAging', currentAging);

                var days30 = result.getValue(colObj[0].days30);
                log.debug('currentAging30', days30);

                var days60 = result.getValue(colObj[0].days60);
                log.debug('currentAging60', days60);

                var days90 = result.getValue(colObj[0].days90);
                log.debug('currentAging90', days90);

                var morethan90Days = result.getValue(colObj[0].morethan90Days);
                log.debug('currentAgingMoreThan90', morethan90Days);

                var amountremaining = result.getValue(colObj[0].amountremaining)
                log.debug('amountremaining', amountremaining);

            }

            // create fields field on print
            form.addField({
                id: "custpage_current_aging",
                type: "currency",
                label: "Current Aging"
            }).defaultValue = currentAging;

            form.addField({
                id: "custpage_days30",
                type: "currency",
                label: "days30"
            }).defaultValue = days30;

            form.addField({
                id: "custpage_days60",
                type: "currency",
                label: "days60"
            }).defaultValue = days60;

            form.addField({
                id: "custpage_days90",
                type: "currency",
                label: "days90"
            }).defaultValue = days90;

            form.addField({
                id: "custpage_morethan90days",
                type: "currency",
                label: "morethan90Days"
            }).defaultValue = morethan90Days;

            form.addField({
                id: "custpage_amountremaining",
                type: "currency",
                label: "amountremaining"
            }).defaultValue = amountremaining;

        }
    }

     return {
        beforeLoad: beforeLoad,
     };
 });