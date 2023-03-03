/**
 *    Copyright (c) 2022, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
     * @param {record} record
     */
    function (record, search, runtime) {


        function afterSubmit(context) {

            try{

                var rec = context.newRecord;
                var recId = rec.id;

                if(rec.type === 'vendor' && (context.type === 'create' || context.type === 'edit')){
                    log.debug('vendor / create');
                    var recObjLoaded = record.load({type: record.Type.VENDOR, id: recId, isDynamic: true});

                    if(runtime.envType == 'PRODUCTION'){

                        var subsidiariesArray = [1, 2, 8, 7];
                        log.debug('envType is:', runtime.envType);
                    }
                    else{

                        var subsidiariesArray= [1, 2, 8, 7];
                        log.debug('envType is:', runtime.envType);
                    }

                    //Get all subsidiaries that already exist in the vendor record
                    var lineCount = recObjLoaded.getLineCount({sublistId: 'submachine'});
                    var existingSubsidiaries = [];

                    for (var lineNum = 0; lineNum < lineCount; lineNum++) {
                        var lineSubsidiary = recObjLoaded.getSublistValue({
                            sublistId: 'submachine',
                            fieldId: 'subsidiary',
                            line: lineNum
                        });

                        existingSubsidiaries.push(lineSubsidiary);
                    }

                    log.debug('existingSubsidiaries:', existingSubsidiaries);


                    for(var x = 0; x < subsidiariesArray.length; x++){
                        //Check if the subsidiaries already exist in the vendor record
                        log.debug('subsidiariesArray[x]:', subsidiariesArray[x].toString());
                        if (existingSubsidiaries.indexOf(subsidiariesArray[x].toString()) == -1) {
                            recObjLoaded.selectNewLine({sublistId: 'submachine'});
                            recObjLoaded.setCurrentSublistValue({
                                sublistId: 'submachine',
                                fieldId: 'subsidiary',
                                value: subsidiariesArray[x]
                            });
                            recObjLoaded.commitLine({sublistId: 'submachine'});
                        }

                    }

                    custRecIdSaved = recObjLoaded.save({enableSourcing: false, ignoreMandatoryFields: true});
                    log.debug('Edited VENDOR:', recId);


                }

            }catch(e){

                log.error(e.name, e.message);
            }
        }

        return {
            afterSubmit: afterSubmit
        };

    });
