/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
	function(record, search) {
   
		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} context
		 * @param {Record} context.newRecord - New record
		 * @param {string} context.type - Trigger type
		 * @param {Form} context.form - Current form
		 * @Since 2015.2
		 */
		function afterSubmit(scriptContext) {
			
			
		try{	
			
			if(scriptContext.type !== scriptContext.UserEventType.CREATE && scriptContext.type !== scriptContext.UserEventType.EDIT && scriptContext.type !== scriptContext.UserEventType.XEDIT) return;
			
			var rec = scriptContext.newRecord;
			var recId = rec.id;
			var recType = rec.type;					
			log.debug('Firing afterSubmit on '+ recType +' with ID:', recId);
			

            var customExternalIdFieldValue = rec.getValue({fieldId: 'custitem_item_extid'});
                        
			
			//if custom field does contain value
			if(customExternalIdFieldValue && customExternalIdFieldValue.length > 0){
			
			
							//set the field values
						if(recType == 'serviceitem'){
							
							var subId = record.submitFields({
								type: record.Type.SERVICE_ITEM,
								id: recId,
								values: {
									'externalid': customExternalIdFieldValue
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
							
							
						}	
						else if(recType == 'otherchargeitem'){
							
							var subId = record.submitFields({
								type: record.Type.OTHER_CHARGE_ITEM,
								id: recId,
								values: {
									'externalid': customExternalIdFieldValue	
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
							
							
						}
						else if(recType == 'discountitem'){
							
							var subId = record.submitFields({
								type: record.Type.DISCOUNT_ITEM,
								id: recId,
								values: {
									'externalid': customExternalIdFieldValue
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
							
							
						}	
						else if(recType == 'kititem'){
							
							var subId = record.submitFields({
								type: record.Type.KIT_ITEM,
								id: recId,
								values: {
									'externalid': customExternalIdFieldValue	
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
							
							
						}
						else if(recType == 'noninventoryitem'){
							
							var subId = record.submitFields({
								type: record.Type.NON_INVENTORY_ITEM,
								id: recId,
								values: {
									'externalid': customExternalIdFieldValue	
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
							
							
						}
						

				
				
			}//end if custom field does have value

			
		}catch(e){

			log.error(e.name, e.message);
		}			

		}
		

		return {
				afterSubmit: afterSubmit

		};
		
	});