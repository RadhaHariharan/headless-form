"use client"

import { useForm, createStringValidator, toValidationRule } from "@headlesskit/forms-react";

interface myForm {
  firstname: string,
  lastname: string,
  email: string,
  user: {
    age: string,
    roles: string[],
    permissions: { name: string }[]
  }
}

export default function Home() {
  // useForm bridges the framework-agnostic store to React via useSyncExternalStore,
  // so the component re-renders whenever validate()/submit() update errors/status.
  const form = useForm<myForm>({
    mode: "uncontrolled",
    initialValues: {
      firstname: "",
      lastname: "",
      email: "",
      user: {
        age: "",
        roles: [],
        permissions: [
          {
            name: "Create"
          }
        ]
      }
    },
    validate: {
      firstname: toValidationRule(createStringValidator({
        required: true,
        minLength: 4,
        maxLength: 12
      })),
      lastname: toValidationRule(createStringValidator({
        required: true,
        minLength: 4,
        maxLength: 12
      })),
      email: toValidationRule(createStringValidator({
        required: true,
      }))
    }
  })

  const submit = () => {
    form.validate();
    console.log(form.getValues())
    console.log(form.errors)
  }

  return (
    <div>
      <input type="text" key={form.key("email")} {...form.getInputProps("email")} />
      <br />
      <input type="text" key={form.key("firstname")} {...form.getInputProps("firstname")} />
      <br />
      <input type="text" key={form.key("lastname")} {...form.getInputProps("lastname")} />
      <br />
      <input type="text" key={form.key("user.age")} {...form.getInputProps("user.age")} />

      <br />
      Email - {form.getValues().email}
      <br />
      FirstName - {form.getValues().firstname}
      <br />
      LastName - {form.getValues().lastname}
      <br />
      Age - {form.getValues().user.age}
      <br />
      Errors - {form.isValid() ? "True" : "False"}
      <br />
      <button onClick={submit}>Submit</button>
    </div>
  );
}
