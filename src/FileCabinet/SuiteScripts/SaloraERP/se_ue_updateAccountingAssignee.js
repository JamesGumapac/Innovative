/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/record', 'N/search'],

	(record, search) => {
	   
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
			var { newRecord, type } = scriptContext;

			if(type != 'create')
				return;

			var accAssignee = newRecord.getValue({ fieldId: 'custbody_accounting_assignee' });
			var entityId = newRecord.getValue({ fieldId: 'entity' });

			if(!accAssignee)
				return;

			var entityType = '';
			var prjAccAssignee = '';
			search.create({
				type: 'entity',
				filters: [['internalid', 'anyof', entityId]],
				columns: [{ name: 'type' }, { name: 'custentity_accounting_assignee' }]
			}).run().getRange(0,1).forEach(res=>{
				entityType = res.getText(res.columns[0]);
				prjAccAssignee = res.getValue(res.columns[1]);
			});

			if(entityType != 'Project')
				return;

			if(accAssignee == prjAccAssignee)
				return;

			var email = search.lookupFields({
				type: 'employee',
				id: accAssignee,
				columns: ['email']
			}).email;

			record.submitFields({
				type: 'job',
				id: entityId,
				values: {
					email,
					custentity_accounting_assignee: accAssignee
				}
			});
		}

		return {
//			beforeLoad,
//			beforeSubmit,
			afterSubmit
		};
		
	});
