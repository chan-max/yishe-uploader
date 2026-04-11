<template>
  <div class="field" :class="{ error: !!error }">
    <label>
      {{ field.label }}
      <span v-if="field.required" class="field-required">*</span>
    </label>

    <template v-if="resolvedComponent === 'array-text'">
      <textarea
        :value="stringValue"
        :rows="field.rows || 4"
        :placeholder="field.placeholder || ''"
        @input="handleInput($event.target.value)"
        @blur="$emit('blur')"
      />
    </template>

    <template v-else-if="resolvedComponent === 'select'">
      <select :value="stringValue" class="ui dropdown" @change="handleInput($event.target.value)" @blur="$emit('blur')">
        <option value="">{{ field.placeholder || `请选择${field.label}` }}</option>
        <option
          v-for="option in normalizedOptions"
          :key="String(option.value)"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </template>

    <template v-else-if="resolvedComponent === 'switch'">
      <div class="ui checkbox compact-checkbox">
        <input
          :id="checkboxId"
          :checked="!!modelValue"
          type="checkbox"
          @change="handleInput($event.target.checked)"
          @blur="$emit('blur')"
        />
        <label :for="checkboxId">{{ field.switchLabel || field.description || `启用${field.label}` }}</label>
      </div>
    </template>

    <template v-else>
      <input
        :value="stringValue"
        :type="resolvedInputType"
        :placeholder="field.placeholder || ''"
        :min="field.min"
        :max="field.max"
        :step="field.step"
        @input="handleInput($event.target.value)"
        @blur="$emit('blur')"
      />
    </template>

    <div v-if="error" class="schema-field-hint error-text">
      {{ error }}
    </div>
    <div v-else-if="hintText" class="schema-field-hint">
      {{ hintText }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  field: {
    type: Object,
    required: true
  },
  modelValue: {
    type: [String, Number, Boolean, Array, Object, null],
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  idPrefix: {
    type: String,
    default: 'schema-field'
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const resolvedComponent = computed(() => String(props.field?.component || 'input').trim() || 'input')
const resolvedInputType = computed(() => {
  if (resolvedComponent.value === 'password') return 'password'
  if (resolvedComponent.value === 'url') return 'url'
  if (resolvedComponent.value === 'input-number') return 'number'
  return String(props.field?.inputType || 'text').trim() || 'text'
})
const normalizedOptions = computed(() =>
  Array.isArray(props.field?.options)
    ? props.field.options.map((item) => ({
      label: String(item?.label || item?.value || '').trim(),
      value: item?.value ?? ''
    }))
    : []
)
const checkboxId = computed(() => `${props.idPrefix}-${String(props.field?.key || 'field')}`)
const stringValue = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.join('\n')
  }
  if (props.modelValue === undefined || props.modelValue === null) {
    return ''
  }
  return String(props.modelValue)
})
const hintText = computed(() => {
  const description = String(props.field?.description || '').trim()
  const example = Array.isArray(props.field?.examples) && props.field.examples.length
    ? String(props.field.examples[0] || '').trim()
    : ''

  if (description && example) {
    return `${description} 例如：${example}`
  }
  return description || (example ? `例如：${example}` : '')
})

function handleInput(value) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.field-required {
  color: #db2828;
  margin-left: 0.2rem;
}

.compact-checkbox {
  margin-top: 0.35rem;
}

.schema-field-hint {
  margin-top: 0.35rem;
  color: #767676;
  font-size: 0.85em;
  line-height: 1.45;
}

.error-text {
  color: #9f3a38;
}
</style>
