/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/record', 'N/runtime', 'N/search', 'N/url'],

	(record, runtime, search, url) => {
	   
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

				var newRecord = scriptContext.newRecord;

				var lookupFields = search.lookupFields({
					type: newRecord.type,
					id: newRecord.id,
					columns: ['custentity_salora_billapprover', 'custentity_salora_tokenid']
				});

				let billApprover = newRecord.getValue({ fieldId: 'custentity_salora_billapprover'}) || lookupFields.custentity_salora_billapprover;
				let approverToken = lookupFields.custentity_salora_tokenid;
	log.debug('details', {billApprover,approverToken});

				if(!billApprover || approverToken)
					return;

				let script = runtime.getCurrentScript();
				let scriptId = script.getParameter('custscript_uegencustbillapplink_suitelet');
				let deploymentId = script.getParameter('custscript_uegencustbillapplk_deployment');

				let key = Math.random().toString(36).substring(2) +
					parseInt(newRecord.id).toString(36) + Date.parse(new Date()).toString(36);

				record.submitFields({
					type: newRecord.type,
					id: newRecord.id,
					values: {
						custentity_salora_tokenid: key,
						custentity_salora_billapprovallink: url.resolveScript({
							scriptId, deploymentId, returnExternalUrl: true,
							params: { eid: key }
						})
					}
				});
		}

		return {
//			beforeLoad,
//			beforeSubmit,
			afterSubmit
		};
		
	});
