Vue.component('summary-accordion', {
  props: {
    workItems: Array,
    headerWidth: Number,
    cellWidth: Number,
    cellHeight: Number,
    totalWidth: Number,
    dates: Array
  },
  data: function () {
    return {
      selected: [],
    }
  },
  computed: {
    ganttGrid: function() {
      return {
        background: '-webkit-linear-gradient(left, rgba(0, 0, 0, 0.1) 1px, transparent 1px) 0% 0% / ' + this.cellWidth + 'px ' + this.cellHeight + 'px',
        background: '-moz-linear-gradient(left, rgba(0, 0, 0, 0.1) 1px, transparent 1px) 0% 0% / ' + this.cellWidth + 'px ' + this.cellHeight + 'px',
        background: '-o-linear-gradient(left, rgba(0, 0, 0, 0.1) 1px, transparent 1px) 0% 0% / ' + this.cellWidth + 'px ' + this.cellHeight + 'px',
        background: 'linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px) 0% 0% / ' + this.cellWidth + 'px ' + this.cellHeight + 'px'
      }
    }
  },
  methods: {
    toggleAccordion: function (id) {
      if(this.selected.indexOf(id) >= 0) {
        this.selected = _.remove(this.selected, function(n) {
          return n != id;
        });
      }
      else {
        this.selected.push(id);
      }
    },
    isAccordionSelected: function(id) {
      return (this.selected.indexOf(id) >= 0);
    },
    getContentHeightStyle: function (height, tasks) {
      var totalHeight = '100%';
      if(tasks) {
        var calc = height * (tasks.length);
        if(calc > 122) {
          totalHeight = calc + 'px';
        }
      }
      return {
        height: totalHeight
      }
    },
    plotTaskStart: function (startDate, isHalfDayStart, isHalfDayEnd) {
      if(startDate) {
        var dateFound = _.find(this.dates, _.matches({
          'day': moment(startDate).date(),
          'month': moment(startDate).month(),
          'year': moment(startDate).year()
        }));
        if(dateFound) {
          var index = this.dates.indexOf(dateFound);
          var left = index * this.cellWidth;
          if(isHalfDayStart) {
            left = left + (this.cellWidth / 2);
          }
          return left;
        }
      }
      return 0;
    },
    plotTaskWidth: function (startDate, endDate, isHalfDayStart, isHalfDayEnd) {
      if(startDate && endDate) {
        var start = _.find(this.dates, _.matches({
          'day': moment(startDate).date(),
          'month': moment(startDate).month(),
          'year': moment(startDate).year()
        }));
        var end = _.find(this.dates, _.matches({
          'day': moment(endDate).date(),
          'month': moment(endDate).month(),
          'year': moment(endDate).year()
        }));
        if(start && end) {
          var startIndex = this.dates.indexOf(start);
          var endIndex = this.dates.indexOf(end);
          var diff = endIndex - startIndex;
          var width = (diff) * (this.cellWidth);
          if(!isHalfDayStart && isHalfDayEnd) {
            width = width + (this.cellWidth / 2);
          }
          else if(isHalfDayStart && !isHalfDayEnd) {
            width = width + (this.cellWidth / 2);
          }
          return width;
        }
      }
      return this.cellWidth;
    },


    deleteTask: function(taskId, parentId) {
      DeleteWorkItem(taskId, false, parentId);
    },

    onResizstop: function (left, top, width, height, target) {
      var taskId = target.$attrs['data-taskId'];
      var capacity = target.$attrs['data-capacity'];
      calculateTaskEffort(left, width, taskId, capacity);
    },

    onDragstop: function (left, top, width, height, target) {
      var taskId = target.$attrs['data-taskId'];
      var capacity = target.$attrs['data-capacity'];
      calculateTaskEffort(left, width, taskId, capacity);
    }
  },
  template: `
  <div class="summary-accordion">
    <div  v-for="item in workItems"
          :class="[{active:isAccordionSelected(item.id)}, 'summary-accordion-item']"
          :style="{ 'border-left-color': '#' + item.typeColor }">
        
      </div>
    </div>
  `
});




Vue.component('summary-accordion-content', {
  props: {
    item: Object
  },
  data: function () {
    return {
      type: {},
      state: {},
      assignedTo: {}
    }
  },
  created: function() {
    setDataVariables();
  },
  computed: {
    headerWidth: function() {
      return this.$parent.headerWidth;
    }
  },
  methods: {
    isAccordionSelected: function (id) {
      return this.$parent.isAccordionSelected(id);
    },
    toggleAccordion: function (id) {
      this.$parent.toggleAccordion(id);
    },

    setDataVariables: function () {
      this.type = _.find(app.workItemTypes, _.matchesProperty('name', this.item.type));
      this.state = _.find(this.type.states, _.matchesProperty('name', this.type.state));

      this.assignedTo = _.find(app.teamMembers, _.matchesProperty('id', this.item.assignedTo));
    },

    openTasks: function (workItemId) {
      if(!app.loading) {
        app.loading = true;
        openAddTask(workItemId);
      }
    },
  },
  template: `
<div class="summary-accordion-header"
     :style="{ width: (isAccordionSelected(item.id) ? headerWidth - 5 : headerWidth) + 'px' }">
    <div class="summary-accordion-header-holder"
         @click="toggleAccordion(item.id)">
        <div class="summary-accordion-header-text">
            <img v-if="type.icon"
                 :src="type.icon"
                 :alt="item.name"
                 class="work-item-type-icon">
            {{ item.name }}
        </div>

        <div class="summary-accordion-header-icon">
            <i class="material-icons">
                keyboard_arrow_down
            </i>
        </div>
      </div>

      <div class="summary-accordion-header-expanded-details">
          
        <v-layout row align-center>
          <v-flex align-self-start shrink>
              <v-avatar size="30px"
              color="grey darken-2">
                <img 
                v-if="assignedTo.avatarUrl"
                :src="assignedTo.avatarUrl"
                :alt="assignedTo.id">
                
                <i v-else
                class="material-icons grey--text lighten-5--text">
                  person
                </i>
              </v-avatar>
          </v-flex>

          <v-flex grow pl-2>
              <span v-if="assignedTo.displayName">
                  {{ assignedTo.displayName }}
              </span>
              <span v-else>
                Unassigned
              </span>
          </v-flex>

          <v-flex align-self-end shrink pr-3>
            
            <v-btn  @click="openTasks(item.id, item.rev)"
                    class="add-task-btn"
                    slot="activator"
                    outline small fab 
                    color="light-blue darken-4">
              <v-icon>more_vert</v-icon>
            </v-btn>

          </v-flex>
        </v-layout>

        <v-layout align-center justify-space-between row>
            <v-flex align-self-start class="story-state-header">
                State:
            </v-flex>
            <v-flex align-self-end>
                <span class="state-circle round"
            :style="{ 'background-color': '#' + state.color, 'box-shadow': '0 0 3px 1px #' + state.color }"></span>
              {{ state.name }}
            </v-flex>
        </v-layout>

      </div>
    </div>

      <div class="summary-accordion-content">
        <div class="summary-accordion-content-summary"
        :style="[ganttGrid, {'width': totalWidth + 'px' }]">
        
          <div v-for="(task, index) in item.tasks"
          class="summary-task-item"
          :style="{'margin-left': plotTaskStart(task.startDate, task.isHalfDayStart, task.isHalfDayEnd) + 'px',
          'width': plotTaskWidth(task.startDate, task.endDate,task.isHalfDayStart, task.isHalfDayEnd) + 'px' }">
            <hr :style="{ 'background-color': '#' + task.typeColor }" />
            <v-avatar size="25px"
            :color="'#' + task.typeColor">
                  <img 
                  style="width:22px; height:22px"
                  v-if="task.assignedAvatar"
                  :src="task.assignedAvatar"
                  :alt="task.assignedName">
                  <i v-else
                  class="material-icons grey--text lighten-5--text">
                    person
                  </i>
              </v-avatar>
          </div>

        </div>

        <div class="summary-accordion-content-main"
        :style="[ganttGrid,
          getContentHeightStyle(cellHeight, item.tasks),
          {'width': totalWidth + 'px' }]">

          <vue-draggable-resizable
            v-for="(task, index) in item.tasks"
            :key="task.id"
            v-if="(isAccordionSelected(item.id))"
            className="task-item-holder"
            :grid="[(cellWidth / 2), cellHeight]"
            :x="plotTaskStart(task.startDate, task.isHalfDayStart, task.isHalfDayEnd)" 
            :y="(cellHeight * index)"
            :h="cellHeight"
            :style="{ height: cellHeight + 'px!important' }"
            :min-height="cellHeight"
            :max-height="cellHeight"
            :w="plotTaskWidth(task.startDate, task.endDate, task.isHalfDayStart, task.isHalfDayEnd)"
            :min-width="(cellWidth / 2)"
            :parent="true"
            :handles="['mr', 'ml']"
            axis="x"
            :data-taskId="task.id"
            :data-capacity="(task.capacity ? task.capacity : 0)"
            @resizestop="onResizstop"
            @dragstop="onDragstop">
            <div  class="task-item"
                  :style="{ 'border-left-color':'#' + task.typeColor,
                'height': cellHeight + 'px' }">
              
            <div class="task-item-name">
                <img  v-if="task.typeIcon.url"
                      :src="task.typeIcon.url"
                      :alt="task.typeIcon.id"
                      class="work-item-type-icon">
                {{ task.name }}
              </div>
              
              <div class="task-item-content">
                <v-avatar size="25px"
                color="grey darken-2">
                  <img 
                  v-if="task.assignedAvatar"
                  :src="task.assignedAvatar"
                  :alt="task.assignedName">
                  
                  <i v-else
                  class="material-icons grey--text lighten-5--text">
                    person
                  </i>
                </v-avatar>
                <span v-if="task.assignedName.length > 0">
                  {{ task.assignedName }}
                </span>
                <span v-else>
                  Unassigned
                </span>
              </div>

              <div  class="delete-icon"
                    :style="{ 'height': (cellHeight - 2) + 'px' }">
                <i class="material-icons red--text"
                @click="deleteTask(task.id, item.id)">
                delete_forever
                </i>
              </div>

            </div>
          </vue-draggable-resizable>

        </div>
      </div>
  `
});
