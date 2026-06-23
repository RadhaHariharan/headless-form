"use client"

import Image from "next/image";
import styles from "./page.module.css";
import { createFormStore, createStringValidator, toValidationRule } from "@headless-form/core";

interface myForm {
  firstname: string,
  lastname: string,
  email: string,
}

export default function Home() {
  const form = createFormStore<myForm>({
    mode: "uncontrolled",
    initialValues: {
      firstname: "",
      lastname: "",
      email: "",
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
      Email - {form.getValues().email}
      <br />
      FirstName - {form.getValues().firstname}
      <br />
      LastName - {form.getValues().lastname}
      <br />
      Errors - {form.isValid() ? "True" : "False"}
      <br />
      <button onClick={submit}>Submit</button>
    </div>
  );
}
