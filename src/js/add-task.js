Vue.component('multiselect', window.VueMultiselect.default)
var app = new Vue({
    el: '#app',
    data: {
        teamMembers: [],
        selectedMember: '',
        activity: [],
        selectedActivity: '',
        taskName:"",
        workItemId: 0,
        workItemRev: 0
    },
    watch: {
        taskName: function() {
            this.isValid();
        },
    },
    methods: {
       isValid: function() {
           var hasMember = false;
           if(this.selectedMember) {
               if(this.selectedMember.id) {
                   hasMember = (this.selectedMember.id.length > 0);
                }
            }
           var hasActivity = false;
           if(this.selectedActivity) {
               if(this.selectedActivity.capacityPerDay && this.selectedActivity.name) {
                   hasActivity = (this.selectedActivity.capacityPerDay > 0 || (this.selectedActivity.name.length > 0));
                }
            }

           var hasName = false;
           if(this.taskName && this.taskName.length > 0) {
            hasName = true;
           }
           dialog.updateOkButton((hasMember && hasActivity && hasName));
       },
       memberSelected: function(selectedOption) {
           this.selectedActivity = {};
           this.activity = [];
           if(selectedOption && selectedOption.activity && selectedOption.activity.length > 0) {
               this.selectedActivity = selectedOption.activity[0];
               this.activity = selectedOption.activity;
            }
            this.isValid();
       },
       memberRemoved: function() {
        this.isValid();
       },
       activitySelected: function(selectedOption) {
        this.isValid();
       },
       activityRemoved: function() {
        this.selectedActivity = {};
        this.isValid();
       },

       hasMember: function() {
        if(this.selectedMember) {
            if(this.selectedMember.displayName) {
                return (this.selectedMember.displayName.length > 0);
             }
         }
         return false;
       }
    }
});

var dialog;
VSS.init();
var addTaskForm = (function() {
    return {
        passTeamMemberData: function(teamMembers) {
            if(teamMembers && teamMembers.length > 0) {
                app.teamMembers = teamMembers;
                app.selectedMember = app.teamMembers[0];
                app.memberSelected(app.selectedMember);
            }
        },
        passDialogService: function(dialogService, workItemId, workItemRev) {
            dialog = dialogService;
            app.workItemId = workItemId;
            app.workItemRev = workItemRev;
        },
        getFormData: function() {
            var formData = {
                workItemId: app.workItemId,
                workItemRev: app.workItemRev,
                memberId: app.selectedMember.id,
                memberName: app.selectedMember.displayName,
                activity: app.selectedActivity.name,
                capacity: app.selectedActivity.capacityPerDay,
                taskName: app.taskName
            }
            return formData;
        }
    };
})();

VSS.register("add-task-form", addTaskForm);