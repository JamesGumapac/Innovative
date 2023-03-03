/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/runtime', 'N/search', 'N/ui/serverWidget', 'N/url'],

	(runtime, search, ui, url) => {
	   
		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		const onRequest = context => {
			let { request, response } = context;
			let params = request.parameters;
			let script = runtime.getCurrentScript();
log.debug('params.eid', params.eid);

			// Get employee id
			let userId = getEmployeeId(params.eid);

			// Get all script parameters
			let searchId = script.getParameter('custscript_custapprbilllist_search');
			let scriptId = script.getParameter('custscript_custapprbilllist_script');
			let deploymentId = script.getParameter('custscript_custapprbilllist_deployment');
log.debug('searchId', searchId);
log.debug('scriptId', scriptId);
log.debug('deploymentId', deploymentId);

			// Get approval page url
			let slApprovalPage = url.resolveScript({
				scriptId, deploymentId, returnExternalUrl: true,
				params: { eid: params.eid }
			});
log.debug('slApprovalPage', slApprovalPage);

			// Build form
			let form = ui.createForm({
				title: 'Bills'
			});

			var scriptField = form.addField({
				id: 'custpage_script',
				label: 'Script',
				type: ui.FieldType.INLINEHTML
			});
			scriptField.defaultValue = `<script>
				require(['N/ui/message'], function(message){
					message.create({
						title: 'Lines Pending Your Approval',
						message: '',
						type: message.Type.INFORMATION
					}).show();
				})
			</script>`;

			let sublistFields = {};
			let sublist = form.addSublist({
				id: 'custpage_bill',
				label: 'For Approval',
				type: ui.SublistType.LIST
			});

			var ss = search.load({
				id: searchId
			});
			ss.filters.push(search.createFilter({
				name: 'nextapprover',
				operator: search.Operator.ANYOF,
				values: userId
			}));
			getAllSSResult( ss.run() ).forEach((res, line) => {
				if(!line){ // Add sublist columns based on search result
					res.columns.forEach((col, c) => {
						if(!c){
							sublistFields['review'] = sublist.addField({
								id: 'custcol_review',
								label: 'Review',
								type: ui.FieldType.TEXTAREA
							});
						}else{
							let id = col.name;
							let label = col.label;

							sublistFields[id] = sublist.addField({
								id: `custcol_${id}`,
								label, type: ui.FieldType[id.match(/amount|total/gi)? 'CURRENCY': 'TEXT']
							});
						}
					});

					for(var x in sublistFields)
						sublistFields[x].updateDisplayType({
							displayType: ui.FieldDisplayType.INLINE
						});
				}

				res.columns.forEach((col, c)=>{
					var id = `custcol_${col.name}`;
					var value = res.getText(col) || res.getValue(col) || '';
					if(!c){
						id = 'custcol_review';
						var link = `${slApprovalPage}&rid=${value}`;
						value = `<a class="dottedlink" target="_self" href="${link}">Review</a>`;
					}

					if(value)
						sublist.setSublistValue({ id, value, line });
				});
			});

			response.writePage( form );
		}

		const getEmployeeId = token => {
			if(!token)
				throw('Invalid URL.');

			let employeeId = '';
			search.create({
				type: 'employee',
				filters: [['custentity_salora_tokenid', 'is', token]]
			}).run().getRange(0,1).forEach(res=>{
				employeeId = res.id;
			});

			if(!employeeId)
				throw('Invalid URL.');

			return employeeId;
		}

		const getAllSSResult = searchResultSet => {
			let result = [];
			for(let x=0;x<=result.length;x+=1000)
				result = result.concat(searchResultSet.getRange(x,x+1000)||[]);
			return result;
		};

		return {
			onRequest
		};
		
	});
