/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/record', 'N/runtime', 'N/search'],

	(record, runtime, search) => {
	   
		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @Since 2015.2
		 */
		const beforeLoad = scriptContext => {

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		const beforeSubmit = scriptContext => {
			var { type, newRecord } = scriptContext;

			if(type == 'create' || type == 'copy'){
				newRecord.setValue({
					fieldId: 'custbody_salora_created_by',
					value: runtime.getCurrentUser().id
				});
			}

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		const afterSubmit = scriptContext => {
			var { type, newRecord } = scriptContext;

			try{
				var headerDepartment = newRecord.getValue({ fieldId: 'custbody_salora_department' });

				if(headerDepartment)
					return;

				var custbody_salora_department = '245';
				search.create({
					type: newRecord.type,
					filters: [
						['mainline', 'is', 'F'], 'AND',
						['department', 'noneof', '@NONE@'], 'AND',
						['internalid', 'anyof', newRecord.id]
					],
					columns: [{ name: 'department' }]
				}).run().getRange(0,1).forEach(res => {
					custbody_salora_department = res.getValue( res.columns[0] )
				});

				record.submitFields({
					type: newRecord.type,
					id: newRecord.id,
					values: {
						custbody_salora_department
					}
				});
			}catch(e){
				log.debug('ERROR', e);
			}
		}

		return {
//			beforeLoad,
			beforeSubmit,
			afterSubmit
		};
		
	});
