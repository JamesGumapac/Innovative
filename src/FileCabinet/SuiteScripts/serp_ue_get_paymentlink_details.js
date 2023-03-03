/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([], () => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (context) => {
    const { newRecord, form } = context;
    let paymentLink = newRecord.getValue({
      fieldId: "custbody_payment_link",
    });

    let link = paymentLink.replaceAll("&", "&amp;");
    let str = `<br />   <br /> <br />
   <strong>For Credit Card Payment Follow the link below: </strong><br />  Surcharges do apply
    <span style="color:blue" ><a href="${link}">Payment Link</a></span>`;
    log.debug("Payment Link", link);
    log.debug("str", str);
    form.addField({
      id: "custpage_rows",
      label: " ",
      type: "richtext",
    }).defaultValue = str;
  };

  return { beforeLoad };
});
