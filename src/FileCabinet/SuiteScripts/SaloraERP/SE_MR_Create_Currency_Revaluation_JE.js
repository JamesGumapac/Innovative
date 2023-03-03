/**
*@NApiVersion 2.0
*@NScriptType MapReduceScript
*@NModuleScope Public
*/

define(['N/search', 'N/runtime', 'N/record', 'N/format'], function (search, runtime, record, format) {

    var scriptObj = runtime.getCurrentScript();
    var scriptDeploymentId = scriptObj.deploymentId;
    var paramSavedSearchCurrencyRevaluation = scriptObj.getParameter('custscript_se_currencyrevalsearch');
    var paramDepartment = scriptObj.getParameter('custscript_se_department');

    function getInputData() {

        log.debug({
            title: 'getInputData()',
            details: 'Starting getInputData() Function'
        });

        log.debug({
            title: 'scriptDeploymentId()',
            details: scriptDeploymentId
        });

        try {
            log.debug({
                title: 'map()',
                details: 'Ending getInputData() Function'
            });

            log.debug({
                title: 'paramSavedSearchCurrencyRevaluation',
                details: paramSavedSearchCurrencyRevaluation //will return internal id of the script parameter
            });

            return {
                type: 'search',
                id: paramSavedSearchCurrencyRevaluation
            };


        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: getInputData()', stError);
        }

    }

    function map(context) {

        log.debug({
            title: 'map()',
            details: 'Starting map() Function'
        });

        try {
            var searchResult = JSON.parse(context.value);

            log.debug({
                title: 'searchResult',
                details: searchResult
            })

            var intTransactionId = searchResult.id;
            var dtTransactionDate = searchResult.values.trandate;
            var intSubsidiaryId = searchResult.values.subsidiary.value;
            var intAccountId = searchResult.values.account.value;
            var flAmount = searchResult.values.amount;
            var intDepartmentId = searchResult.values.department.value;

            objData = {};
            objData.intTransactionId = intTransactionId;
            objData.dtTransactionDate = dtTransactionDate;
            objData.intSubsidiaryId = intSubsidiaryId;
            objData.intAccountId = intAccountId;
            objData.intDepartmentId = intDepartmentId;
            objData.flAmount = flAmount;

            log.debug({
                title: 'objData',
                details: objData
            })

            context.write(intTransactionId, objData);

            log.debug({
                title: 'map()',
                details: 'Ending map() Function'
            });

        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: map()', stError);
        }

    }

    function reduce(context) {
        log.debug({
            title: 'reduce()',
            details: 'Starting reduce() Function'
        });

        try {

            var objDataMappedKey = context.key;
            var objDataRaw = JSON.parse(context.values[0]);
            var intTransactionId = objDataRaw.intTransactionId;
            var dtTransactionDate = objDataRaw.dtTransactionDate;
            dtTransactionDate = format.parse({
                value: dtTransactionDate,
                type: format.Type.DATE
            });
            var intSubsidiaryId = objDataRaw.intSubsidiaryId;
            var intAccountId = objDataRaw.intAccountId;
            var flAmount = parseFloat(objDataRaw.flAmount);

            log.debug({
                title: 'objDataMappedKey',
                details: objDataMappedKey
            });

            log.debug({
                title: 'intTransactionId//dtTransactionDate//intSubsidiaryId//intAccountId//flAmount',
                details: intTransactionId + '//' + dtTransactionDate + '//' + intSubsidiaryId + '//' + intAccountId + '//' + flAmount
            });


            //Journal Entry Creation
            var objJournalRecord = record.create({
                type: 'journalentry',
                isDynamic: true
            });

            objJournalRecord.setValue('subsidiary', intSubsidiaryId);
            objJournalRecord.setValue('trandate', dtTransactionDate);
            objJournalRecord.setValue('memo', 'Currency Revaluation Journal Entry with Department Impact');
            objJournalRecord.setValue('custbody_serp_linked_currency_reval', intTransactionId);
            objJournalRecord.setValue('approvalstatus', 2);


            if (flAmount < 0) {

                // debit Line
                objJournalRecord.selectNewLine('line');
                //Set the value for the field in the currently selected line.
                objJournalRecord.setCurrentSublistValue('line', 'account', intAccountId);
                objJournalRecord.setCurrentSublistValue('line', 'department', '');
                objJournalRecord.setCurrentSublistValue('line', 'debit', Math.abs(flAmount));
                objJournalRecord.setCurrentSublistValue('line', 'memo', "Currency Revaluation Department Adjustment");
                //Commits the currently selected line on a sublist.
                objJournalRecord.commitLine('line');

                // credit Line
                objJournalRecord.selectNewLine('line');
                //Set the value for the field in the currently selected line.
                objJournalRecord.setCurrentSublistValue('line', 'account', intAccountId);
                objJournalRecord.setCurrentSublistValue('line', 'department', paramDepartment);
                objJournalRecord.setCurrentSublistValue('line', 'credit', Math.abs(flAmount));
                objJournalRecord.setCurrentSublistValue('line', 'memo', "Currency Revaluation Department Adjustment");
                //Commits the currently selected line on a sublist.
                objJournalRecord.commitLine('line');

            }
            else if (flAmount >= 0) {
                // credit Line
                objJournalRecord.selectNewLine('line');
                //Set the value for the field in the currently selected line.
                objJournalRecord.setCurrentSublistValue('line', 'account', intAccountId);
                objJournalRecord.setCurrentSublistValue('line', 'department', '');
                objJournalRecord.setCurrentSublistValue('line', 'credit', Math.abs(flAmount));
                objJournalRecord.setCurrentSublistValue('line', 'memo', "Currency Revaluation Department Adjustment");
                //Commits the currently selected line on a sublist.
                objJournalRecord.commitLine('line');

                // debit Line
                objJournalRecord.selectNewLine('line');
                //Set the value for the field in the currently selected line.
                objJournalRecord.setCurrentSublistValue('line', 'account', intAccountId);
                objJournalRecord.setCurrentSublistValue('line', 'department', paramDepartment);
                objJournalRecord.setCurrentSublistValue('line', 'debit', Math.abs(flAmount));
                objJournalRecord.setCurrentSublistValue('line', 'memo', "Currency Revaluation Department Adjustment");
                //Commits the currently selected line on a sublist.
                objJournalRecord.commitLine('line');
            }

            //save the record.
            objJournalRecord.save();

            log.debug({
                title: 'reduce()',
                details: 'Ending reduce() Function'
            });

        } catch (ex) {
            var stError = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
            log.error('Error: reduce()', stError);
        }

    }


    function summarize(context) {

        log.debug({
            title: 'summarize()',
            details: 'Starting summarize() Function'
        });

        log.debug({
            title: 'summarize()',
            details: 'Ending summarize() Function'
        });

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
