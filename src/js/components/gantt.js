var gantt = Vue.component('gantt', {
  props: {
    headerWidth: Number,
    cellWidth: Number,
    cellHeight: Number,
    startDate: Date,
    endDate: Date,
    workItems: Array,
    workingDays: Array
  },
  data: function () {
    return {
      dates: [],
      totalWidth: 0,
    }
  },
  created: function () {
    this.dates = this.getDates();
  },
  methods:{
    getDates: function () {
      var dateArray = new Array();
      var currentDate = new Date(this.startDate);
      var today = moment();
      var prevMonth;
      while (currentDate <= new Date(this.endDate)) {
        if(this.isWorkingDay(currentDate)) {
          var diff = moment(currentDate).diff(today, 'days');
          var sameDay = (today.format('DD/MM/YYYY') == moment(currentDate).format('DD/MM/YYYY'));
          if(diff >= 0 && !sameDay) {
            app.remainingWorkDays++;
          }
          dateArray.push({
            year: moment(currentDate).year(),
            month: moment(currentDate).month(),
            monthName: moment(currentDate).format('MMMM'),
            monthNameShort: moment(currentDate).format('MMM'),
            isNewMonth: (prevMonth != moment(currentDate).month()),
            daysInMonth: 0,
            day: moment(currentDate).date(),
            weekDay: moment(currentDate).day(),
            weekDayName: moment(currentDate).format('ddd'),
            date: moment(currentDate).toDate()
          });
          prevMonth = moment(currentDate).month();
        }
        currentDate = moment(currentDate).add(1, 'days');
      }
      this.calculateDaysInMonth(dateArray);
      return dateArray;
    },
    isWorkingDay: function (date) {
      var dayName = moment(date).format('dddd').toLowerCase();
      return this.workingDays.includes(dayName);
    },
    calculateDaysInMonth: function(dateArray) {
      dateArray.forEach(date => {
        if(date.isNewMonth) {
          date.daysInMonth = _.filter(dateArray, {
            'year': date.year,
            'month': date.month
          }).length;
          this.totalWidth = this.totalWidth + (date.daysInMonth * this.cellWidth);
        }
      });
    },
  },
  template: `
  <div class="gantt-container">
    <div  class="gantt-header"
          :style="{ 'margin-left': headerWidth + 'px' }">
      
      <div  class="gantt-header-months"
            :style="{ width: totalWidth + 'px'}">
        <div  v-for="d in dates"
              v-if="d.isNewMonth"
              class="gantt-header-month"
              :style="{ width: (cellWidth * d.daysInMonth) + 'px' }">
          {{ d.monthName }} {{ d.year }}
        </div>
      </div>

      <div  class="gantt-header-days"
            :style="{ width: totalWidth + 'px'}">
        <div  v-for="d in dates" 
              :class="[{ 'gantt-header-day-new' : d.isNewMonth}, 'gantt-header-day']"
              :style="{ width: cellWidth + 'px' }">
          {{ d.day }}
        </div>
      </div>

      <div  class="gantt-header-days-min"
            :style="{ width: totalWidth + 'px'}">
        <div  v-for="d in dates"
              :class="[{ 'gantt-header-day-min-new' : d.isNewMonth}, 'gantt-header-day-min']"
              :style="{ width: cellWidth + 'px' }">
          {{ d.weekDayName }}
        </div>
      </div>

    </div>

    <div  class="gantt-items"
          :style="{ width: (totalWidth + headerWidth) + 'px'}">

      <summary-accordion  :work-items="workItems"
                          :dates="dates" 
                          :header-width="headerWidth"
                          :cell-width="cellWidth"
                          :cell-height="cellHeight"
                          :total-width="totalWidth">
      </summary-accordion>

    </div>
  </div>
  `
});