const defaultCapacity = 6;
var ganttControl = [];
var app = new Vue({
  el: '#app',
  data: {
    snackbar: {
      show: false,
      type: 'error',
      text: '',
      timeout: 3000
    },
    
    loading: true,
    remainingWorkDays: 0,
    
    allRequest: 0,

    teamDetailRequests: 0,
    teamDetailRequestsCompleted: 0,

    iterationRequests: 0,
    iterationRequestsCompleted: 0,

    itemTypeRequests: 0,
    itemTypeRequestsCompleted: 0,

    itemStateRequests: 0,
    itemStateRequestsCompleted: 0,

    teamName: "",
    teamMembers: [],
    selectedMembers: [],
    teamDaysOff: [],
    workingDays: [],

    currentIteration: {},
    workItems: [],
    workItemTypes: []
  },
  watch: {
    allRequest: function () {
      if(this.allRequest != 0 && this.allRequest == 4) {
        this.allRequest = 0;
        assignTeamMemberData();
        assignWorkItemStates();
        assignWorkItemTasks();
        // assignWorkItemMember();
        this.loadComponents();
        this.loading = false;
        handleError('All requests completed', 'success');
      }
    },

    teamDetailRequestsCompleted: function () {
      if(this.teamDetailRequests != 0 && this.teamDetailRequests == this.teamDetailRequestsCompleted) {
        this.teamDetailRequests = 0;
        this.teamDetailRequestsCompleted = 0;
        this.allRequest++;
      }
    },

    iterationRequestsCompleted: function () {
      if(this.iterationRequests != 0 && this.iterationRequests == this.iterationRequestsCompleted) {
        getWorkItemTypeData();
        this.iterationRequests = 0;
        this.iterationRequestsCompleted = 0;
        this.allRequest++;
      }
    },

    itemTypeRequestsCompleted: function () {
      if(this.itemTypeRequests != 0 && this.itemTypeRequests == this.itemTypeRequestsCompleted) {
        this.itemTypeRequests = 0;
        this.itemTypeRequestsCompleted = 0;
        this.allRequest++;
      }
    },

    itemStateRequestsCompleted: function () {
      if(this.itemStateRequests != 0 && this.itemStateRequests == this.itemStateRequestsCompleted) {
        this.itemStateRequests = 0;
        this.itemStateRequestsCompleted = 0;
        this.allRequest++;
      }
    },

    selectedMembers: function(newVal, oldVal) {
      ganttControl.workItems = this.filterWorkItems();
    }
  },
  computed: {

  },
  methods: {
    formatDate: function(date, format) {
      return moment(date).format(format);
    },
    showSnackbar: function (text, type) {
      if(!type) {
        type = 'error';
      }
      this.snackbar.show = true;
      this.snackbar.text = text;
      this.snackbar.type = type;
    },
    loadComponents: function () {
      var ganttComponent = Vue.extend(gantt)
      ganttControl = new ganttComponent({
          propsData: { 
            headerWidth: 250,
            cellWidth:120,
            cellHeight:50,
            startDate: moment(this.currentIteration.startDate).toDate(),
            endDate: moment(this.currentIteration.finishDate).toDate(),
            workItems: this.filterWorkItems(),
            workingDays: this.workingDays
         }
      });
      ganttControl.$mount();
      
      this.$refs.ganttContainer.appendChild(ganttControl.$el);
    },
    filterWorkItems: function() {
      if(this.selectedMembers.length > 0) {
        var newWorkItemCollection = [];

        this.selectedMembers.forEach(member => {
          this.workItems.forEach(item => {
            if(item.assignedId == member.id) {
              newWorkItemCollection.push(item);
            }
            else {
              if(item.tasks && item.tasks.length > 0) {
                item.tasks.forEach(task => {
                  if(task.assignedId == member.id) {
                    newWorkItemCollection.push(item);
                  }
                });
              }
            }
          });
        });
        if(newWorkItemCollection.length > 0) {
          return _.orderBy(_.uniq(newWorkItemCollection), ['priority', 'id']);
        }
      }
      return _.orderBy(this.workItems, ['priority', 'id']);
    },

    getTypeData: function(typeName) {
      var type = _.find(this.workItemTypes, _.matchesProperty('name', typeName));
      return type;
    },
    getStateData: function(type, stateName) {
      var state = _.find(type.states, _.matchesProperty('name', stateName));
      return state;
    },
  }
});

var params;
VSS.require(["VSS/Authentication/Services"],
  (VSS_Auth_Service) => {
  VSS.getAccessToken().then((token) => {
    init(
      VSS_Auth_Service.authTokenManager.getAuthorizationHeader(token)
    );
    
    getTeamData();
    getIterationData();

    VSS.notifyLoadSucceeded();
  });
});

function init(token) {
  params = new UrlParameters();
  params.bearerToken = token;
  params.global.organization = VSS.getWebContext().host.name;
  params.global.organizationId = VSS.getWebContext().host.id;
  params.global.project = VSS.getWebContext().project.name;
  params.global.projectId = VSS.getWebContext().project.id;
  params.global.team = VSS.getWebContext().team.name;
  params.global.teamId = VSS.getWebContext().team.id;
}

function getTeamData() {
  app.teamName = VSS.getWebContext().team.name;
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/_apis/projects/{projectId}/teams/{teamId}/members?api-version=5.0");
  var httpCall = new PostData(getUrl, params.bearerToken);
  httpCall.callback = getTeamDataResponce;
  httpCall.callType = "team";
  httpGetData(httpCall);
}
var listTeamMembers = [];
var listMembersData = [];
function getTeamDataResponce(response) {
  if(response && response.count > 0) {
    response.value.forEach(member => {
      var teamMember = new TeamMember(
        member.identity.id,
        member.identity.displayName,
        member.identity.uniqueName,
        member.identity.imageUrl,
        member.isTeamAdmin
        );
        listTeamMembers.push(teamMember);
    });
  }
}
function assignTeamMemberData() {
  listTeamMembers.forEach(member => {
    var index = listTeamMembers.indexOf(member);
    var memberData = listMembersData.find((data) => {
      return data.memberId == member.id;
    });
    if(memberData) {
      listTeamMembers[index].activity = memberData.activities;
      listTeamMembers[index].offDays = memberData.daysOff;
    }
  });
  app.teamMembers = listTeamMembers;
}


function getIterationData() {
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/{team}/_apis/work/teamsettings/iterations?api-version=5.0");
  var httpCall = new PostData(getUrl, params.bearerToken);
  httpCall.callback = getIterationsResponce;
  httpGetData(httpCall);
}
function getIterationsResponce(response) {
  if(response && response.count > 0) {
    response.value.forEach(iteration => {
      if(iteration.attributes.timeFrame == 'current') {
        var httpCall = new PostData(iteration.url,
          params.bearerToken);
        httpCall.callback = getCurrentIterationResponce;
        httpGetData(httpCall);
      }
    });
  }
}
function getCurrentIterationResponce(response) {
  if(response) {
    app.currentIteration = new Iteration(
      response.id, 
      response.name, 
      response.attributes.startDate, 
      response.attributes.finishDate
    );

    var capacityCall = new PostData(
      response._links.capacity.href,
      params.bearerToken);
      capacityCall.callback = getCapacity;
      httpGetData(capacityCall);

    var daysOffCall = new PostData(
      response._links.teamDaysOff.href,
      params.bearerToken);
      daysOffCall.callback = getDaysOff;
      httpGetData(daysOffCall);
    
    var workingDaysCall = new PostData(
      response._links.teamSettings.href,
      params.bearerToken);
      workingDaysCall.callback = getWorkingDays;
      httpGetData(workingDaysCall);

    var workItemRelationsCall = new PostData(
      response._links.workitems.href,
      params.bearerToken);
      workItemRelationsCall.callback = getWorkItemRelations;
      httpGetData(workItemRelationsCall);
  }
}

function getCapacity(response) {
  if(response && response.count > 0) {
    response.value.forEach(capacity => {
      listMembersData.push({
          "memberId" : capacity.teamMember.id,
          "activities" : capacity.activities,
          "daysOff" : capacity.daysOff,
        });
    });
  }
}

function getDaysOff(response) {
  if(response) {
    app.teamDaysOff = response.daysOff;
  }
}

function getWorkingDays(response) {
  if(response) {
    app.workingDays = response.workingDays;
  }
}

var linkedWorkItems = [];
function getWorkItemRelations(response) {
  if(response) {
    response.workItemRelations.forEach(item => {
      var workItemCall = new PostData(
        item.target.url,
        params.bearerToken);
        workItemCall.callback = getWorkItemDetails;
        httpGetData(workItemCall);

        if(item.source) {
          linkedWorkItems.push({
            parentId: item.source.id,
            childId: item.target.id 
          })
        }
    });
  }
}

// var listWorkItemTypesCalls = [];
// var listWorkItemTypes = [];
function getWorkItemDetails(response) {
  if(response) {
    var workItem = createWorkItem(response);
    app.workItems.push(workItem);
    //
    // listWorkItemTypesCalls.push(response._links.workItemType.href);
  }
}
function createWorkItem(data) {
  var name = null;
  var priority = null;
  var state = null;
  var type = null;
  var assignedTo = null;
  var startDate = null;
  var endDate = null;
  var activity = null;
  var capacity = defaultCapacity;
  var isHalfDayStart = false;
  var isHalfDayEnd = false;

  if (data.fields["System.Title"]) {
    name = data.fields["System.Title"];
  }
  if (data.fields["Microsoft.VSTS.Common.Priority"]) {
    priority = data.fields["Microsoft.VSTS.Common.Priority"];
  }
  if (data.fields["System.State"]) {
    state = data.fields["System.State"];
  }
  if (data.fields["System.WorkItemType"]) {
    type = data.fields["System.WorkItemType"];
  }
  if (data.fields["System.AssignedTo"]) {
    assignedTo = data.fields["System.AssignedTo"].id;
  }
  if (data.fields["Custom.StartDate"]) {
    startDate = data.fields["Custom.StartDate"];
  }
  if (data.fields["Custom.EndDate"]) {
    endDate = data.fields["Custom.EndDate"];
  }
  if (data.fields["Custom.Activity"]) {
    activity = data.fields["Custom.Activity"];
  }
  if (data.fields["Custom.Capacity"]) {
    capacity = data.fields["Custom.Capacity"];
  }
  if (data.fields["Custom.HalfDayStart"]) {
    isHalfDayStart = data.fields["Custom.HalfDayStart"];
  }
  if (data.fields["Custom.HalfDayEnd"]) {
    isHalfDayEnd = data.fields["Custom.HalfDayEnd"];
  }
  var workItem = new WorkItem(
      data.id,
      data.rev,
      name,
      data._links.html.href,
      priority,
      state,
      type,
      assignedTo,
      startDate,
      endDate,
      activity,
      capacity,
      isHalfDayStart,
      isHalfDayEnd
  );
  return workItem;
}
// function getWorkItemTypes() {
//   var uniqueCalls = _.uniq(listWorkItemTypesCalls);
//   uniqueCalls.forEach(url => {
//     var workItemTypesCall = new PostData(url, params.bearerToken);
//         workItemTypesCall.callback = getWorkItemTypesResponce;
//         workItemTypesCall.callType = "item_type";
//         httpGetData(workItemTypesCall);
//   });
// }
// function getWorkItemTypesResponce(response) {
//   var type = new WorkItemType(
//     response.name,
//     response.color,
//     response.icon,
//     response.states
//   );
//   app.workItemTypes.push(type);
// }
//
// function assignWorkItemStates() {
//   app.workItems.forEach(item => {
//     var info = getWorkItemState(item.type, item.state);
//     item.stateColor = info.stateColor;
//     item.typeColor = info.typeColor;
//     item.typeIcon = info.typeIcon;
//   });
// }
// function getWorkItemState(typeName, stateName) {
//   var type = _.find(app.workItemTypes, _.matchesProperty('name', typeName));
//
//   var stateColor = "b2b2b2";
//   var typeColor = "f2cb1d";
//   var typeIcon = "";
//
//   if(type && type.states) {
//     var state = _.find(type.states, _.matchesProperty('name', stateName));
//     stateColor = state.color;
//     typeColor = type.color;
//     typeIcon = type.icon;
//   }
//   return {
//     stateColor: stateColor,
//     typeColor: type.color,
//     typeIcon: type.icon
//   }
// }

// function assignWorkItemMember() {
//   app.workItems.forEach(item => {
//     if(item.assignedId) {
//       var member = _.find(app.teamMembers, _.matchesProperty('id', item.assignedId));
//       item.assignedName = member.displayName;
//       item.assignedAvatar = member.avatarUrl;
//     }
//   });
//   assignWorkItemTasks();
// }

function assignWorkItemTasks() {
  linkedWorkItems.forEach(links => {
    var parentItem = app.workItems.filter(function(obj){
      return obj.id == links.parentId;
    })[0];
    var childItem = app.workItems.filter(function(obj){
      return obj.id == links.childId;
    })[0];
    app.workItems = app.workItems.filter(function(ele){
      return ele != childItem;
    });
    var parentIndex = app.workItems.indexOf(parentItem);
    app.workItems[parentIndex].tasks.push(childItem);
  });
}

var addTaskForm;
function openAddTask(workItemId, workItemRev) {
  VSS.getService(VSS.ServiceIds.Dialog).then(function(dialogService) {
    var extensionCtx = VSS.getExtensionContext();
    // Build absolute contribution ID for dialogContent
    var contributionId = extensionCtx.publisherId + "." + extensionCtx.extensionId + ".add-task-form";
  
    // Show dialog
    var dialogOptions = {
        title: "Add a Task",
        width: 800,
        height: 600,
        getDialogResult: function() {
          return addTaskForm ? addTaskForm.getFormData() : null;
        },
        okCallback: function (result) {
          addNewWorkItem(result);
        }
    };
  
    var smallTeam = [];
    app.teamMembers.forEach(member => {
      smallTeam.push({
        id: member.id,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        activity: member.activity
      })
    });
    dialogService.openDialog(contributionId, dialogOptions)
    .then((dialog) => {
      dialog.getContributionInstance("add-task-form").then
      (function (addTaskFormInstance) {
        addTaskForm = addTaskFormInstance; 
        addTaskForm.passTeamMemberData(smallTeam);
        addTaskForm.passDialogService(dialog, workItemId, workItemRev);
        dialog.updateOkButton(false);
      });

      app.loading = false;
    });
  });
}

function addNewWorkItem(data) {
  params.additional = {
    type: 'task'
  }
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/${type}?api-version=5.0");
  
  var requestBody = [
    {
      "op": "add",
      "path": "/fields/System.Title",
      "from": null,
      "value": data.taskName
    }
  ]
  fetch(getUrl, {
    method: 'POST',
    headers: new Headers({
      'Authorization': params.bearerToken,
      'Content-Type': 'application/json-patch+json'
    }),
    body: JSON.stringify(requestBody)
  })
  .then(function(response) {
    if(response.ok) {
      return response.json();
    }
    else {
      handleError('Unable to create task', 'error');
    }
  })
  .then(function(myJson) {
    if(myJson) {
      UpdateNewTask(myJson, data);
    }
  })
  .catch(function(error) {
    handleError('Unable to create task', 'error', error);
  });
}

function UpdateNewTask(newTask, data) {

  var startDate = new Date();
  var startIndex = _.sortedIndexBy(ganttControl.dates, { 'date': startDate }, 'date');
  if(startIndex == undefined){
    startDate = ganttControl.startDate;
    startIndex = 0;
  }
  else {
    startDate = ganttControl.dates[startIndex - 1].date
  }
  data.startDate = moment(startDate).toDate();

  var endDate = moment(startDate).add(2, 'days').toDate();
  var diff = moment(endDate).diff(ganttControl.dates[ganttControl.dates.length - 1], 'days');
  if(diff > 0) {
    endDate = ganttControl.dates[ganttControl.dates.length - 1].date;
  }
  var endIndex = _.sortedIndexBy(ganttControl.dates, { 'date': endDate }, 'date');

  data.endDate = moment(endDate).toDate();

  var dayRange = endIndex - startIndex;

  var requestBody = [{
    "op": "add",
    "path": "/fields/System.IterationPath",
    "value": VSS.getWebContext().project.name + "\\" + app.currentIteration.name
  },
  {
    "op": "add",
    "path": "/fields/System.AssignedTo",
    "value": data.memberName
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Common.Activity",
    "value": data.activity
  },
  {
    "op": "add",
    "path": "/fields/Custom.Capacity",
    "value": data.capacity
  },
  {
    "op": "add",
    "path": "/fields/Custom.StartDate",
    "value": data.startDate
  },
  {
    "op": "add",
    "path": "/fields/Custom.EndDate",
    "value": data.endDate
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Scheduling.RemainingWork",
    "value": parseFloat(dayRange * data.capacity)
  }
];
  params.additional = {
    id: newTask.id
  };
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}?api-version=5.0");
  fetch(getUrl, {
    method: 'PATCH',
    headers: new Headers({
      'Authorization': params.bearerToken,
      'Content-Type': 'application/json-patch+json'
    }),
    body: JSON.stringify(requestBody)
  }).then(function(response){
    if(response.ok) {
      LinkNewTaskToStory(newTask, data);
    }
    else {
      handleError('Unable to update task details. Attempting rollback!', 'warning');
      DeleteWorkItem(newTask.id);
    }
  })
  .catch(function(error) {
    handleError('Unable to update task details. Attempting rollback!', 'warning', error);
  });
}

function LinkNewTaskToStory(newTask, data) {
  var requestBody = [{
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "System.LinkTypes.Hierarchy-Forward",
      "url": newTask._links.self.href
    }
  }];
  params.additional = {
    id: data.workItemId
  };
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}?api-version=5.0");
  fetch(getUrl, {
    method: 'PATCH',
    headers: new Headers({
      'Authorization': params.bearerToken,
      'Content-Type': 'application/json-patch+json'
    }),
    body: JSON.stringify(requestBody)
  })
  .then(function(response) {
    if(response.ok) {
      updateStaticTaskData(newTask, 'add', data);
      handleError('New task created successfully.', 'success');
    }
    else {
      handleError('Unable to link task to parent. Attempting rollback!', 'warning');
      DeleteWorkItem(newTask.id);
    }
  })
  .catch(function(error) {
    handleError('Unable to link task to parent. Attempting rollback!', 'warning', error);
  });
}

function DeleteWorkItem(workItemId, isRollback, parentId) {
  if(!isRollback) {
    isRollback = false;
  }
  if(workItemId && workItemId > 0) {
    params.additional = {
      id: workItemId
    }
    var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}?api-version=5.0");
    fetch(getUrl, {
      method: 'DELETE',
      headers: new Headers({
        'Authorization': params.bearerToken
      })
    })
    .then(function(response) {
      if(response.ok) {
        handleError(
          ((isRollback) ? 'Task has been rolled back successfully.' : 'Task was deleted successfully.'),
        'success');
        return response.json();
      }
      else {
        handleError('Unable to delete work item: ' +  workItemId, 'error');
      }
    })
    .then(function(myJson) {
      if(myJson) {
        updateStaticTaskData(myJson, 'delete', parentId);
      }
    })
    .catch(function(err) {
      handleError('Unable to delete work item: ' +  workItemId, 'error', err);
    });
  }
}

function MoveTask(taskId, startDate, endDate, isHalfStart, isHalfEnd, effort) {
  var requestBody = [{
    "op": "add",
    "path": "/fields/Custom.StartDate",
    "value": startDate.date
  },
  {
    "op": "add",
    "path": "/fields/Custom.EndDate",
    "value": endDate.date
  },
  {
    "op": "add",
    "path": "/fields/Custom.HalfDayStart",
    "value": isHalfStart
  },
  {
    "op": "add",
    "path": "/fields/Custom.HalfDayEnd",
    "value": isHalfEnd
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Scheduling.RemainingWork",
    "value": parseFloat(effort)
  }
];
var test = JSON.stringify(requestBody);
  params.additional = {
    id: taskId
  };
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}?api-version=5.0");
  fetch(getUrl, {
    method: 'PATCH',
    headers: new Headers({
      'Authorization': params.bearerToken,
      'Content-Type': 'application/json-patch+json'
    }),
    body: test
  }).then(function(response) {
    if(response.ok) {
      return response.json();
    }
    else {
      handleError('Unable to update task details.', 'warning');
    }
  }).then(function(data) {
    if(data) {
      updateStaticTaskData(data, 'move');
    }
  })
  .catch(function(error) {
    handleError('Unable to update task details.', 'warning', error);
  });
}

function updateStaticTaskData(data, updateType, newTaskData) {
  switch(updateType) {
    case'move':
    var parentWorkItem = getParentWorkItemFromTask(data);
    var task = findTaskInParentByTaskId(data.id, parentWorkItem)
    if(parentWorkItem != null && task != null) {
      task.startDate = moment(data.fields['Custom.StartDate']).toDate();
      task.isHalfDayStart = Boolean(data.fields['Custom.HalfDayStart']);
      task.endDate = moment(data.fields['Custom.EndDate']).toDate();
      task.isHalfDayEnd = Boolean(data.fields['Custom.HalfDayEnd']);
    }
    break;
    case'add':
    var parentWorkItem = getParentWorkItemById(newTaskData.workItemId);
    if(parentWorkItem != null) {
      var workItem = createWorkItem(data);
      workItem.assignedId = newTaskData.memberId;
      workItem.startDate = newTaskData.startDate;
      workItem.endDate = newTaskData.endDate;
  
      var info = getWorkItemState(workItem.type, workItem.state);
      workItem.stateColor = info.stateColor;
      workItem.typeColor = info.typeColor;
      workItem.typeIcon = info.typeIcon;
  
      var member = _.find(app.teamMembers, _.matchesProperty('id', workItem.assignedId));
      workItem.assignedName = member.displayName;
      workItem.assignedAvatar = member.avatarUrl;

      parentWorkItem.tasks.push(workItem);
    }
    break;
    case'delete':
    var parentId = newTaskData;
    var parentWorkItem = getParentWorkItemById(parentId);
    var task = findTaskInParentByTaskId(data.id, parentWorkItem)
    if(parentWorkItem != null && task != null) {
      parentWorkItem.tasks = _.remove(parentWorkItem.tasks, function(item) {
        return item.id != task.id;
      });
    }
    break;
  }
}

function getParentWorkItemFromTask(task) {
  var parentId;
  if(task.relations && task.relations.length > 0) {
    task.relations.forEach(rel => {
      if(rel.url && rel.url.length > 0) {
        var urlArray = rel.url.split('/');
        if(urlArray && urlArray.length > 0) {
          parentId = urlArray[urlArray.length - 1];
        }
      }
    });
  }
  return getParentWorkItemById(parentId);
}
function getParentWorkItemById(parentId) {
  if(parentId && parentId > 0) {
    var parentWorkItem = _.find(app.workItems, function(o) { 
      return o.id == parentId;
    });
    return parentWorkItem;
  }
  return null;
}

function findTaskInParentByTaskId(taskId, parentWorkItem) {
  if(parentWorkItem != null && parentWorkItem.tasks && parentWorkItem.tasks.length > 0 && taskId && taskId > 0) {
    var task = _.find(parentWorkItem.tasks, function(task) { 
      return task.id == taskId;
    });
    return task;
  }
  return null;
}

function handleError(text, type, errorObj) {
  switch(type) {
    case 'info':
    console.log(text);
    if(errorObj) {
      console.group();
      console.log(errorObj);
      console.groupEnd();
    }
    break;
    case 'warning':
    console.warn(text);
    if(errorObj) {
      console.group();
      console.warn(errorObj);
      console.groupEnd();
    }
    break;
    case 'success':
    console.log(text);
    if(errorObj) {
      console.group();
      console.log(errorObj);
      console.groupEnd();
    }
    break;
    default:
    console.error(text);
    type = 'error';
    if(errorObj) {
      console.group();
      console.error(errorObj);
      console.groupEnd();
    }
    break;
  }
  app.showSnackbar(text, type);
}

function calculateTaskEffort(left, width, taskId, capacity) {
  if(!capacity || capacity == 0) {
    capacity = defaultCapacity;
  }
 
  var index = (left / 2) / (ganttControl.cellWidth / 2);
  var isHalfStart = (index % 1 != 0);
  index = Math.floor(index);
  index = (index == 0 ? 0 : index);
  
  var dayRange = (width) / (ganttControl.cellWidth / 2);
  var isHalfEnd = false;
  if(isHalfStart) {
    isHalfEnd = ((width - (ganttControl.cellWidth / 2)) % ganttControl.cellWidth != 0);
  }
  else {
    isHalfEnd = (width % ganttControl.cellWidth != 0)
  }
  
  var endIndex = index + Math.floor(dayRange / 2);
  endIndex = (endIndex == ganttControl.dates.length ? ganttControl.dates.length : endIndex);

  var startDate = ganttControl.dates[index];
  var endDate = ganttControl.dates[endIndex];
  var effort = (capacity / 2) * dayRange;
  effort = Math.ceil(effort);

  MoveTask(taskId, startDate, endDate, isHalfStart, isHalfEnd, effort);
}






function getWorkItemTypeData() {
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitemtypes?api-version=5.0");
  var httpCall = new PostData(getUrl, params.bearerToken);
  httpCall.callback = workItemTypeDataResponce;
  httpCall.callType = "item_type";
  httpGetData(httpCall);
}
function workItemTypeDataResponce(response) {
  app.workItemTypes = [];
  if(response && response.count > 0) {
    response.value.forEach(item => {
      var type = new WorkItemType(
          item.name,
          item.color,
          item.icon.url
      );
      app.workItemTypes.push(type);
    });
    addStatesToWorkItemTypes();
  }
}

function addStatesToWorkItemTypes() {
  var uniqueCalls = _.uniq(app.workItemTypes);
  uniqueCalls.forEach(type => {
    getWorkItemStateData(type.name);
  });
}

function getWorkItemStateData(workItemTypeName) {
  params.additional = {
    type: workItemTypeName.toLowerCase()
  };
  var getUrl = params.getUrl("https://dev.azure.com/{organization}/{project}/_apis/wit/workitemtypes/{type}/states?api-version=5.0-preview.1");
  var httpCall = new PostData(getUrl, params.bearerToken);
  httpCall.callback = workItemStateDataResponce;
  httpCall.callbackParameters = workItemTypeName;
  httpCall.callType = "item_state";
  httpGetData(httpCall);
}
function workItemStateDataResponce(response, workItemTypeName) {
  if(response && response.count > 0) {
    var type = _.find(app.workItemTypes, _.matchesProperty('name', workItemTypeName));
    type.states = [];
    response.value.forEach(item => {
      var type = new WorkItemState(
          item.name,
          item.color,
          item.category
      );
      type.states.push(type);
    });
  }
}
