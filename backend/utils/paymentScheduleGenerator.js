const moment = require('moment');

class PaymentScheduleGenerator {
  /**
   * Generate payment schedule based on rental agreement
   * @param {Object} rentalAgreement - Rental agreement data
   * @returns {Array} - Array of payment schedule objects
   */
  generateSchedule(rentalAgreement) {
    const schedules = [];
    const {
      id: rental_agreement_id,
      contract_number,
      start_date,
      end_date,
      duration_value,
      duration_unit,
      rental_amount,
      rental_period
    } = rentalAgreement;

    let currentDate = moment(start_date);
    const endDateMoment = moment(end_date);
    let periodNumber = 1;

    // Determine increment based on rental period
    const incrementUnit = rental_period === 'day' ? 'days' : 'months';
    const incrementValue = 1;

    while (currentDate.isBefore(endDateMoment) || currentDate.isSame(endDateMoment, 'day')) {
      const periodStart = currentDate.format('YYYY-MM-DD');
      let periodEnd;

      // Calculate period end date
      if (rental_period === 'day') {
        periodEnd = currentDate.format('YYYY-MM-DD');
        currentDate.add(1, 'days');
      } else if (rental_period === 'month') {
        const nextMonth = moment(currentDate).add(1, 'months');
        periodEnd = moment.min(nextMonth.subtract(1, 'days'), endDateMoment).format('YYYY-MM-DD');
        currentDate.add(1, 'months');
      }

      // Don't create schedule beyond end date
      if (moment(periodStart).isAfter(endDateMoment)) {
        break;
      }

      schedules.push({
        rental_agreement_id,
        contract_number,
        due_date: periodStart,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        amount_due: parseFloat(rental_amount),
        amount_paid: 0,
        balance: parseFloat(rental_amount),
        status: 'pending',
        is_overdue: false,
        days_overdue: 0,
        late_fee: 0
      });

      periodNumber++;

      // Safety limit to prevent infinite loops
      if (periodNumber > 1000) {
        console.warn('Payment schedule generation exceeded 1000 periods');
        break;
      }
    }

    return schedules;
  }

  /**
   * Update payment schedule status based on current date
   * @param {Array} schedules - Payment schedules
   * @returns {Array} - Updated schedules
   */
  updateScheduleStatus(schedules) {
    const today = moment();

    return schedules.map(schedule => {
      const dueDate = moment(schedule.due_date);
      const balance = schedule.amount_due - schedule.amount_paid;

      // Update status
      if (schedule.amount_paid >= schedule.amount_due) {
        schedule.status = 'paid';
        schedule.is_overdue = false;
        schedule.days_overdue = 0;
      } else if (schedule.amount_paid > 0) {
        schedule.status = 'partial';
        if (today.isAfter(dueDate, 'day')) {
          schedule.is_overdue = true;
          schedule.days_overdue = today.diff(dueDate, 'days');
        }
      } else if (today.isAfter(dueDate, 'day')) {
        schedule.status = 'overdue';
        schedule.is_overdue = true;
        schedule.days_overdue = today.diff(dueDate, 'days');
      } else {
        schedule.status = 'pending';
        schedule.is_overdue = false;
        schedule.days_overdue = 0;
      }

      schedule.balance = balance;

      return schedule;
    });
  }

  /**
   * Calculate late fee based on days overdue
   * @param {number} daysOverdue - Number of days overdue
   * @param {number} amount - Original amount
   * @param {Object} options - Late fee options
   * @returns {number} - Late fee amount
   */
  calculateLateFee(daysOverdue, amount, options = {}) {
    const {
      lateFeeType = 'percentage', // 'percentage' or 'fixed'
      lateFeeValue = 5, // 5% or $5
      lateFeeGracePeriod = 3, // Days before late fee applies
      lateFeeMaxAmount = null // Maximum late fee cap
    } = options;

    if (daysOverdue <= lateFeeGracePeriod) {
      return 0;
    }

    let lateFee = 0;

    if (lateFeeType === 'percentage') {
      lateFee = (amount * lateFeeValue) / 100;
    } else if (lateFeeType === 'fixed') {
      lateFee = lateFeeValue;
    }

    // Apply cap if specified
    if (lateFeeMaxAmount && lateFee > lateFeeMaxAmount) {
      lateFee = lateFeeMaxAmount;
    }

    return parseFloat(lateFee.toFixed(2));
  }

  /**
   * Get next due payment for a rental agreement
   * @param {Array} schedules - Payment schedules
   * @returns {Object|null} - Next due payment or null
   */
  getNextDuePayment(schedules) {
    const today = moment();
    const unpaid = schedules.filter(s => s.status !== 'paid');

    if (unpaid.length === 0) {
      return null;
    }

    // Sort by due date
    unpaid.sort((a, b) => moment(a.due_date).diff(moment(b.due_date)));

    return unpaid[0];
  }

  /**
   * Get overdue payments
   * @param {Array} schedules - Payment schedules
   * @returns {Array} - Overdue payments
   */
  getOverduePayments(schedules) {
    return schedules.filter(s => s.is_overdue === true);
  }

  /**
   * Calculate total outstanding amount
   * @param {Array} schedules - Payment schedules
   * @returns {number} - Total outstanding
   */
  getTotalOutstanding(schedules) {
    return schedules.reduce((total, schedule) => {
      if (schedule.status !== 'paid') {
        return total + (schedule.amount_due - schedule.amount_paid);
      }
      return total;
    }, 0);
  }

  /**
   * Apply payment to schedules (allocate payment to due periods)
   * @param {Array} schedules - Payment schedules
   * @param {number} paymentAmount - Payment amount
   * @param {string} paymentDate - Payment date
   * @returns {Object} - Allocation details
   */
  applyPayment(schedules, paymentAmount, paymentDate) {
    const allocations = [];
    let remainingAmount = paymentAmount;

    // Sort schedules by due date (oldest first)
    const sortedSchedules = [...schedules].sort((a, b) =>
      moment(a.due_date).diff(moment(b.due_date))
    );

    for (const schedule of sortedSchedules) {
      if (remainingAmount <= 0) break;
      if (schedule.status === 'paid') continue;

      const balance = schedule.amount_due - schedule.amount_paid;
      const amountToApply = Math.min(remainingAmount, balance);

      if (amountToApply > 0) {
        allocations.push({
          schedule_id: schedule.id,
          billing_period_start: schedule.billing_period_start,
          billing_period_end: schedule.billing_period_end,
          amount_applied: amountToApply,
          previous_amount_paid: schedule.amount_paid,
          new_amount_paid: schedule.amount_paid + amountToApply,
          previous_balance: balance,
          new_balance: balance - amountToApply
        });

        remainingAmount -= amountToApply;
      }
    }

    return {
      total_payment: paymentAmount,
      allocated_amount: paymentAmount - remainingAmount,
      remaining_amount: remainingAmount,
      allocations
    };
  }
}

module.exports = new PaymentScheduleGenerator();
