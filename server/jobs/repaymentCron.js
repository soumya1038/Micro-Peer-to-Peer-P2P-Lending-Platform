const cron = require('node-cron');
const { refreshDueStatuses } = require('../services/repaymentService');

function startRepaymentCron() {
    const schedule = process.env.REPAYMENT_CRON_SCHEDULE || '0 * * * *';

    cron.schedule(schedule, async () => {
        try {
            const result = await refreshDueStatuses();
            console.log(`[repayment-cron] Updated due statuses for ${result.updatedLoanCount} loans`);
        } catch (error) {
            console.error('[repayment-cron] Failed to refresh due statuses:', error.message);
        }
    });

    setTimeout(async () => {
        try {
            const result = await refreshDueStatuses();
            console.log(`[repayment-cron] Initial sync complete for ${result.updatedLoanCount} loans`);
        } catch (error) {
            console.error('[repayment-cron] Initial sync failed:', error.message);
        }
    }, 5000);
}

module.exports = { startRepaymentCron };
