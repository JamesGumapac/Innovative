/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search'],

	(email, record, runtime, search) => {
	   
		/**
		 * Marks the beginning of the Map/Reduce process and generates input data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		 */
		const getInputData = () => {
			var script = runtime.getCurrentScript();

			var billApproverField = script.getParameter('custscript_custbillapp_billapproverfld');
			var billApproverLinkFld = script.getParameter('custscript_custbillapp_billapplinkfld');

			return search.create({
				type: 'vendorbill',
				filters: [
					['mainline', 'is', 'T'], 'AND',
					['approvalstatus', 'anyof', '1'], 'AND',
					[billApproverField, 'noneof', '@NONE@']
				],
				columns: [
					{ name: billApproverField, summary: 'GROUP' },
					{ name: billApproverLinkFld, join: billApproverField, summary: 'GROUP' }
				]
			});
		}

		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		const map = context => {
			var script = runtime.getCurrentScript();
			var billApproverField = script.getParameter('custscript_custbillapp_billapproverfld');
			var billApproverLinkFld = script.getParameter('custscript_custbillapp_billapplinkfld');
			var savedSearchId = script.getParameter('custscript_custbillapp_savedsearch');
			var author = script.getParameter('custscript_custbillapp_author');
			var cc = script.getParameter('custscript_custbillapp_cc');
			cc = cc? cc.split(','): null;

			var res = JSON.parse(context.value).values;

			var billApprover = res[`GROUP(${billApproverField})`].value;
			var billApproverLink = res[`GROUP(${billApproverLinkFld}.${billApproverField})`];

			if(!billApproverLink)
				return;

			var savedSearch = search.load({ id: savedSearchId });
			var filterExpression = savedSearch.filterExpression;
			filterExpression.push('AND', [billApproverField, 'anyof', billApprover]);
			savedSearch.filterExpression = filterExpression;

			var table = ``;
			getAllSSResult(savedSearch.run()).forEach(res=>{
				if(!table){
					table += `<table style="collapse: collapse;border: 1px Solid #000000;" width="100%">
							<caption><b>FOR YOUR APPROVAL</b></caption><tr>
						`;
					res.columns.forEach(col=>{
						table += `<th>${col.label.toUpperCase()}</th>`;
					});
					table += `</tr>`;
				}

				table += `<tr>`;
				res.columns.forEach(col=>{
					var value = res.getText(col) || res.getValue(col) || '';

					if(col.name.match(/amount/gi))
						value = addCommas(value);

					table += `<td align="${col.name.match(/amount/gi)? 'right': 'left'}">${value}</td>`;
				});
				table += '</tr>';
			});
			table += `</table>`;

			var body = `<html><style>*{font-size:12px;font-family:'verdana' , 'arial' , 'helvetica' , sans-serif;}
				table{border-collapse: collapse;border: 1px Solid #000000;}
				td,th{border: 1px Solid #000000;padding: 2px;}</style><body><p>Greetings,
				<br/><br/><a href="${billApproverLink}" target="blank">Please click here to navigate to the approval list page.</a></p>
				<br />${table}
				</body></html>`;

			email.send({
				author,
				recipients: billApprover,
				subject: `Bills For Your Approval`,
				body, cc
			});
		}

		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		const reduce = context => {

		}


		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		const summarize = summary => {

		}

		const getAllSSResult = searchResultSet => {
			var result = [];
			for(var x=0;x<=result.length;x+=1000)
				result = result.concat(searchResultSet.getRange(x,x+1000)||[]);
			return result;
		};

		const addCommas = x => {
			var parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}

		return {
			getInputData,
			map,
//			reduce,
//			summarize
		};
		
	});
