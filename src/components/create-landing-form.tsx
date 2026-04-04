"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Landing, LandingFormFieldKey, LandingType } from "@/domain/types";

type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type EditableImage = {
  id: string;
  sortOrder: number;
  src: string;
  alt: string;
};

type EditableButton = {
  id: string;
  label: string;
  href: string;
  widthRatio: number;
  sortOrder: number;
};

type EditableFormField = {
  id: string;
  fieldKey: LandingFormFieldKey;
  label: string;
  placeholder: string;
  required: boolean;
  sortOrder: number;
};

type EditableLandingPayload = {
  title: string;
  publicSlug: string;
  description: string;
  theme: {
    primaryColor: string;
    textColor: string;
    surfaceColor: string;
    radius: number;
  };
  images: EditableImage[];
  buttons: EditableButton[];
  formFields: EditableFormField[];
  htmlSource: {
    htmlSource: string;
  } | null;
};

const FIELD_OPTIONS: Array<{ key: LandingFormFieldKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "memo1", label: "Memo 1" },
  { key: "memo2", label: "Memo 2" },
  { key: "memo3", label: "Memo 3" },
];

function buildImage(sortOrder: number): EditableImage {
  return {
    id: crypto.randomUUID(),
    sortOrder,
    src: "",
    alt: "",
  };
}

function buildButton(sortOrder: number): EditableButton {
  return {
    id: crypto.randomUUID(),
    label: `CTA Button ${sortOrder}`,
    href: "https://example.com",
    widthRatio: 1,
    sortOrder,
  };
}

function buildField(sortOrder: number, fieldKey: LandingFormFieldKey = "memo1"): EditableFormField {
  return {
    id: crypto.randomUUID(),
    fieldKey,
    label: FIELD_OPTIONS.find((option) => option.key === fieldKey)?.label ?? "Field",
    placeholder: "",
    required: false,
    sortOrder,
  };
}

function reindex<T extends { sortOrder: number }>(items: T[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index + 1,
  }));
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);

  if (!item) {
    return items;
  }

  next.splice(toIndex, 0, item);
  return next;
}

function buildDefaultPayload(type: LandingType): EditableLandingPayload {
  return {
    title: "",
    publicSlug: "",
    description: "",
    theme: {
      primaryColor: "#2563eb",
      textColor: "#0f172a",
      surfaceColor: "#ffffff",
      radius: 18,
    },
    images: [buildImage(1)],
    buttons: type === "button" ? [buildButton(1)] : [],
    formFields: type === "form" ? [buildField(1, "name"), buildField(2, "phone")] : [],
    htmlSource:
      type === "html"
        ? {
            htmlSource: "<section><h1>Paste your HTML here</h1></section>",
          }
        : null,
  };
}

function buildPayloadFromLanding(landing: Landing): EditableLandingPayload {
  return {
    title: landing.title,
    publicSlug: landing.publicSlug,
    description: landing.description ?? "",
    theme: landing.theme,
    images:
      landing.images.length > 0
        ? reindex(
            landing.images.map((image) => ({
              id: image.id,
              sortOrder: image.sortOrder,
              src: image.src,
              alt: image.alt ?? "",
            })),
          )
        : [buildImage(1)],
    buttons: reindex(
      landing.buttons.map((button) => ({
        id: button.id,
        label: button.label,
        href: button.href,
        widthRatio: button.widthRatio,
        sortOrder: button.sortOrder,
      })),
    ),
    formFields: reindex(
      landing.formFields.map((field) => ({
        id: field.id,
        fieldKey: field.fieldKey,
        label: field.label,
        placeholder: field.placeholder ?? "",
        required: field.required,
        sortOrder: field.sortOrder,
      })),
    ),
    htmlSource: landing.htmlSource
      ? { htmlSource: landing.htmlSource.htmlSource }
      : landing.type === "html"
        ? { htmlSource: "" }
        : null,
  };
}

export function CreateLandingForm({
  ownerEmail,
  initialLanding,
}: {
  ownerEmail: string;
  initialLanding?: Landing;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialLanding);
  const [type, setType] = useState<LandingType>(initialLanding?.type ?? "button");
  const [payload, setPayload] = useState<EditableLandingPayload>(() =>
    initialLanding ? buildPayloadFromLanding(initialLanding) : buildDefaultPayload("button"),
  );
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);

  function updateType(nextType: LandingType) {
    setType(nextType);
    setPayload((previous) => ({
      ...buildDefaultPayload(nextType),
      title: previous.title,
      publicSlug: previous.publicSlug,
      description: previous.description,
      theme: previous.theme,
      images: previous.images.length > 0 ? previous.images : [buildImage(1)],
    }));
  }

  function updateImage(index: number, field: keyof EditableImage, value: string | number) {
    setPayload((previous) => ({
      ...previous,
      images: previous.images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [field]: value } : image,
      ),
    }));
  }

  function addImage() {
    setPayload((previous) => ({
      ...previous,
      images: [...previous.images, buildImage(previous.images.length + 1)],
    }));
  }

  function removeImage(index: number) {
    setPayload((previous) => ({
      ...previous,
      images:
        previous.images.length === 1
          ? previous.images
          : reindex(previous.images.filter((_, imageIndex) => imageIndex !== index)),
    }));
  }

  function moveImage(index: number, direction: "up" | "down") {
    setPayload((previous) => ({
      ...previous,
      images: reindex(
        moveItem(previous.images, index, direction === "up" ? index - 1 : index + 1),
      ),
    }));
  }

  async function uploadImageFile(index: number, file: File) {
    setUploadingImageIndex(index);
    setState({ status: "idle" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { message?: string; src?: string };
      const uploadedSrc = result.src;

      if (!response.ok || !uploadedSrc) {
        throw new Error(result.message ?? "Image upload failed.");
      }

      setPayload((previous) => ({
        ...previous,
        images: previous.images.map((image, imageIndex) =>
          imageIndex === index ? { ...image, src: uploadedSrc } : image,
        ),
      }));
      setState({ status: "success", message: `Image ${index + 1} uploaded.` });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Image upload failed.",
      });
    } finally {
      setUploadingImageIndex(null);
    }
  }

  function updateButton(index: number, field: keyof EditableButton, value: string | number) {
    setPayload((previous) => ({
      ...previous,
      buttons: previous.buttons.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, [field]: value } : button,
      ),
    }));
  }

  function addButton() {
    setPayload((previous) => ({
      ...previous,
      buttons: [...previous.buttons, buildButton(previous.buttons.length + 1)],
    }));
  }

  function removeButton(index: number) {
    setPayload((previous) => ({
      ...previous,
      buttons:
        previous.buttons.length <= 1
          ? previous.buttons
          : reindex(previous.buttons.filter((_, buttonIndex) => buttonIndex !== index)),
    }));
  }

  function moveButton(index: number, direction: "up" | "down") {
    setPayload((previous) => ({
      ...previous,
      buttons: reindex(
        moveItem(previous.buttons, index, direction === "up" ? index - 1 : index + 1),
      ),
    }));
  }

  function updateField(
    index: number,
    field: keyof EditableFormField,
    value: string | boolean,
  ) {
    setPayload((previous) => ({
      ...previous,
      formFields: previous.formFields.map((formField, fieldIndex) =>
        fieldIndex === index ? { ...formField, [field]: value } : formField,
      ),
    }));
  }

  function addField() {
    setPayload((previous) => ({
      ...previous,
      formFields: [...previous.formFields, buildField(previous.formFields.length + 1)],
    }));
  }

  function removeField(index: number) {
    setPayload((previous) => ({
      ...previous,
      formFields:
        previous.formFields.length <= 1
          ? previous.formFields
          : reindex(previous.formFields.filter((_, fieldIndex) => fieldIndex !== index)),
    }));
  }

  function moveField(index: number, direction: "up" | "down") {
    setPayload((previous) => ({
      ...previous,
      formFields: reindex(
        moveItem(previous.formFields, index, direction === "up" ? index - 1 : index + 1),
      ),
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "idle" });
    setIsSubmitting(true);

    try {
      const response = await fetch(
        isEdit ? `/api/landings/${initialLanding?.id}` : "/api/landings",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            ownerEmail,
            type,
            ...payload,
            images: reindex(payload.images.filter((image) => image.src.trim())),
            buttons: reindex(payload.buttons),
            formFields: reindex(payload.formFields),
          }),
        },
      );

      const result = (await response.json()) as { message?: string; landing?: { id: string } };

      if (!response.ok || !result.landing) {
        throw new Error(result.message ?? `Landing ${isEdit ? "update" : "creation"} failed.`);
      }

      setState({
        status: "success",
        message: `Landing ${isEdit ? "updated" : "created"}: ${result.landing.id}`,
      });
      router.push(`/landings/${result.landing.id}`);
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : `Landing ${isEdit ? "update" : "creation"} failed.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="section-heading">
        <span className="eyebrow">Landing</span>
        <h2>{isEdit ? "Edit Landing" : "Create Draft Landing"}</h2>
        <p>Now supports multiple images, multiple buttons, and dynamic DB fields.</p>
      </div>

      <label>
        Landing type
        <select
          disabled={isEdit}
          value={type}
          onChange={(event) => updateType(event.target.value as LandingType)}
        >
          <option value="button">Button</option>
          <option value="form">DB Form</option>
          <option value="html">HTML Source</option>
        </select>
      </label>

      <label>
        Title
        <input
          value={payload.title}
          onChange={(event) => setPayload((prev) => ({ ...prev, title: event.target.value }))}
          required
          type="text"
        />
      </label>

      <label>
        Public slug
        <input
          value={payload.publicSlug}
          onChange={(event) =>
            setPayload((prev) => ({ ...prev, publicSlug: event.target.value.trim() }))
          }
          placeholder="my-landing-slug"
          required
          type="text"
        />
      </label>

      <label>
        Description
        <textarea
          rows={3}
          value={payload.description}
          onChange={(event) =>
            setPayload((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </label>

      <div className="grid-two">
        <label>
          Primary color
          <input
            value={payload.theme.primaryColor}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                theme: { ...prev.theme, primaryColor: event.target.value },
              }))
            }
            type="text"
          />
        </label>

        <label>
          Text color
          <input
            value={payload.theme.textColor}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                theme: { ...prev.theme, textColor: event.target.value },
              }))
            }
            type="text"
          />
        </label>
      </div>

      <div className="grid-two">
        <label>
          Surface color
          <input
            value={payload.theme.surfaceColor}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                theme: { ...prev.theme, surfaceColor: event.target.value },
              }))
            }
            type="text"
          />
        </label>

        <label>
          Radius
          <input
            value={payload.theme.radius}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                theme: { ...prev.theme, radius: Number(event.target.value) || 0 },
              }))
            }
            min={0}
            type="number"
          />
        </label>
      </div>

      <section className="editor-section">
        <div className="editor-section-header">
          <div>
            <strong>Images</strong>
            <p>Images are rendered in order as one continuous landing page.</p>
          </div>
          <button className="ghost-button" onClick={addImage} type="button">
            Add Image
          </button>
        </div>

        <div className="editor-stack">
          {payload.images.map((image, index) => (
            <div className="editor-card" key={image.id}>
              <div className="editor-card-header">
                <strong>Image {index + 1}</strong>
                <div className="editor-actions">
                  <button
                    className="ghost-button"
                    disabled={index === 0}
                    onClick={() => moveImage(index, "up")}
                    type="button"
                  >
                    Up
                  </button>
                  <button
                    className="ghost-button"
                    disabled={index === payload.images.length - 1}
                    onClick={() => moveImage(index, "down")}
                    type="button"
                  >
                    Down
                  </button>
                  <button
                    className="ghost-button"
                    disabled={payload.images.length === 1}
                    onClick={() => removeImage(index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <label>
                Image URL
                <input
                  placeholder="https://..."
                  type="url"
                  value={image.src}
                  onChange={(event) => updateImage(index, "src", event.target.value)}
                />
              </label>

              <label>
                Upload image file
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploadingImageIndex === index}
                  type="file"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    if (selectedFile) {
                      void uploadImageFile(index, selectedFile);
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label>
                Alt text
                <input
                  type="text"
                  value={image.alt}
                  onChange={(event) => updateImage(index, "alt", event.target.value)}
                />
              </label>

              {image.src ? (
                <div className="image-preview-card">
                  <img alt={image.alt || `Preview ${index + 1}`} className="image-preview" src={image.src} />
                </div>
              ) : null}

              {uploadingImageIndex === index ? (
                <p className="status-success">Uploading image...</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {type === "button" ? (
        <section className="editor-section">
          <div className="editor-section-header">
            <div>
              <strong>Buttons</strong>
              <p>Add multiple CTA buttons and control their width ratios.</p>
            </div>
            <button className="ghost-button" onClick={addButton} type="button">
              Add Button
            </button>
          </div>

          <div className="editor-stack">
            {payload.buttons.map((button, index) => (
              <div className="editor-card" key={button.id}>
                <div className="editor-card-header">
                  <strong>Button {index + 1}</strong>
                  <div className="editor-actions">
                    <button
                      className="ghost-button"
                      disabled={index === 0}
                      onClick={() => moveButton(index, "up")}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="ghost-button"
                      disabled={index === payload.buttons.length - 1}
                      onClick={() => moveButton(index, "down")}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="ghost-button"
                      disabled={payload.buttons.length <= 1}
                      onClick={() => removeButton(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid-two">
                  <label>
                    Label
                    <input
                      type="text"
                      value={button.label}
                      onChange={(event) => updateButton(index, "label", event.target.value)}
                    />
                  </label>

                  <label>
                    Link
                    <input
                      type="url"
                      value={button.href}
                      onChange={(event) => updateButton(index, "href", event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Width ratio
                  <input
                    min={1}
                    step={0.1}
                    type="number"
                    value={button.widthRatio}
                    onChange={(event) =>
                      updateButton(index, "widthRatio", Number(event.target.value) || 1)
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {type === "form" ? (
        <section className="editor-section">
          <div className="editor-section-header">
            <div>
              <strong>Form Fields</strong>
              <p>Add, remove, and configure required lead fields.</p>
            </div>
            <button className="ghost-button" onClick={addField} type="button">
              Add Field
            </button>
          </div>

          <div className="editor-stack">
            {payload.formFields.map((field, index) => (
              <div className="editor-card" key={field.id}>
                <div className="editor-card-header">
                  <strong>Field {index + 1}</strong>
                  <div className="editor-actions">
                    <button
                      className="ghost-button"
                      disabled={index === 0}
                      onClick={() => moveField(index, "up")}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="ghost-button"
                      disabled={index === payload.formFields.length - 1}
                      onClick={() => moveField(index, "down")}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="ghost-button"
                      disabled={payload.formFields.length <= 1}
                      onClick={() => removeField(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid-two">
                  <label>
                    Field type
                    <select
                      value={field.fieldKey}
                      onChange={(event) =>
                        updateField(index, "fieldKey", event.target.value as LandingFormFieldKey)
                      }
                    >
                      {FIELD_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Required
                    <select
                      value={field.required ? "required" : "optional"}
                      onChange={(event) =>
                        updateField(index, "required", event.target.value === "required")
                      }
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                    </select>
                  </label>
                </div>

                <div className="grid-two">
                  <label>
                    Label
                    <input
                      type="text"
                      value={field.label}
                      onChange={(event) => updateField(index, "label", event.target.value)}
                    />
                  </label>

                  <label>
                    Placeholder
                    <input
                      type="text"
                      value={field.placeholder}
                      onChange={(event) => updateField(index, "placeholder", event.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {type === "html" ? (
        <label>
          HTML source
          <textarea
            rows={12}
            value={payload.htmlSource?.htmlSource ?? ""}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                htmlSource: { htmlSource: event.target.value },
              }))
            }
          />
        </label>
      ) : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save landing" : "Create landing"}
      </button>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "status-success" : "status-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
