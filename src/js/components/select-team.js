Vue.component('multiselect', window.VueMultiselect.default)
var selectTeam = Vue.component('select-team', {
  props: {
    placeholder: String,
    height: Number,
    isMultiselect: Boolean,
    teamMembers: Array,
  },
  data: function () {
    return {
      selectedItems: []
    }
  },
  watch: {
    selectedItems: function(value) {
      app.selectedTeamMember(value);
    }
  },
  created: function() {
    console.log("I HAVE BEEN CREATED!!!!");
    console.log("Check my member: ", this.teamMembers);
  },
  template: `
  <multiselect v-model="selectedItems"  
  :placeholder="placeholder"
  label="displayName"
  track-by="displayName"
  :options="teamMembers"
  :option-height="height"
  :multiple="isMultiselect">

  <template slot="singleLabel" slot-scope="props">
      <v-avatar :size="(height - 5) + 'px'">
        <img  class="option__image"
              :src="props.option.avatarUrl"
              alt="props.option.displayName">
      </v-avatar>
      {{ props.option.displayName }}
    </template>

    <template slot="option" slot-scope="props">
      <v-avatar :size="(height - 5) + 'px'">
        <img class="option__image"
        :src="props.option.avatarUrl"
        alt="props.option.displayName">
      </v-avatar>
      {{ props.option.displayName }}
    </template>
    
  </multiselect>
  `
});