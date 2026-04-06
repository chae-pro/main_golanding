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
  metaPixelId: string;
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
  { key: "name", label: "이름" },
  { key: "email", label: "이메일" },
  { key: "phone", label: "전화번호" },
  { key: "address", label: "주소" },
  { key: "memo1", label: "메모 1" },
  { key: "memo2", label: "메모 2" },
  { key: "memo3", label: "메모 3" },
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
    label: `버튼 ${sortOrder}`,
    href: "https://example.com",
    widthRatio: 1,
    sortOrder,
  };
}

function buildField(sortOrder: number, fieldKey: LandingFormFieldKey = "memo1"): EditableFormField {
  return {
    id: crypto.randomUUID(),
    fieldKey,
    label: FIELD_OPTIONS.find((option) => option.key === fieldKey)?.label ?? "입력 항목",
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
    metaPixelId: "",
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
            htmlSource: "<section><h1>여기에 HTML 소스를 붙여넣으세요</h1></section>",
          }
        : null,
  };
}

function buildPayloadFromLanding(landing: Landing): EditableLandingPayload {
  return {
    title: landing.title,
    publicSlug: landing.publicSlug,
    description: landing.description ?? "",
    metaPixelId: landing.metaPixelId ?? "",
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

  function updateType(nextType: LandingType) {
    setType(nextType);
    setPayload((previous) => ({
      ...buildDefaultPayload(nextType),
      title: previous.title,
      publicSlug: previous.publicSlug,
      description: previous.description,
      metaPixelId: previous.metaPixelId,
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
        throw new Error(
          result.message ?? (isEdit ? "랜딩 수정에 실패했습니다." : "랜딩 생성에 실패했습니다."),
        );
      }

      setState({
        status: "success",
        message: isEdit ? "랜딩이 수정되었습니다." : "랜딩이 생성되었습니다.",
      });
      router.replace("/");
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : isEdit
              ? "랜딩 수정에 실패했습니다."
              : "랜딩 생성에 실패했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="section-heading">
        <span className="eyebrow">랜딩 편집기</span>
        <h2>{isEdit ? "랜딩 수정" : "랜딩 초안 만들기"}</h2>
        <p>여러 장의 이미지, 여러 개의 버튼, 동적 DB 입력 항목까지 구성할 수 있습니다.</p>
      </div>

      <label>
        랜딩 유형
        <select
          disabled={isEdit}
          value={type}
          onChange={(event) => updateType(event.target.value as LandingType)}
        >
          <option value="button">버튼형</option>
          <option value="form">DB 수집형</option>
          <option value="html">HTML 소스형</option>
        </select>
      </label>

      <label>
        제목
        <input
          value={payload.title}
          onChange={(event) => setPayload((prev) => ({ ...prev, title: event.target.value }))}
          required
          type="text"
        />
      </label>

      <label>
        공개 슬러그
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
        설명
        <textarea
          rows={3}
          value={payload.description}
          onChange={(event) =>
            setPayload((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </label>

      <label>
        Meta Pixel ID
        <input
          inputMode="numeric"
          placeholder="123456789012345"
          type="text"
          value={payload.metaPixelId}
          onChange={(event) =>
            setPayload((prev) => ({
              ...prev,
              metaPixelId: event.target.value.replace(/\D/g, ""),
            }))
          }
        />
      </label>

      <div className="grid-two">
        <label>
          기본 색상
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
          텍스트 색상
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
          배경 색상
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
          모서리 둥글기
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
            <p>이미지는 순서대로 이어져 하나의 긴 랜딩페이지처럼 노출됩니다.</p>
            <p>현재 운영 버전에서는 이미지 업로드 대신 외부 이미지 URL 입력 방식만 사용합니다.</p>
          </div>
          <button className="ghost-button" onClick={addImage} type="button">
            이미지 추가
          </button>
        </div>

        <div className="editor-stack">
          {payload.images.map((image, index) => (
            <div className="editor-card" key={image.id}>
              <div className="editor-card-header">
                <strong>이미지 {index + 1}</strong>
                <div className="editor-actions">
                  <button
                    className="ghost-button"
                    disabled={index === 0}
                    onClick={() => moveImage(index, "up")}
                    type="button"
                  >
                    위로
                  </button>
                  <button
                    className="ghost-button"
                    disabled={index === payload.images.length - 1}
                    onClick={() => moveImage(index, "down")}
                    type="button"
                  >
                    아래로
                  </button>
                  <button
                    className="ghost-button"
                    disabled={payload.images.length === 1}
                    onClick={() => removeImage(index)}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <label>
                이미지 URL
                <input
                  placeholder="https://..."
                  type="url"
                  value={image.src}
                  onChange={(event) => updateImage(index, "src", event.target.value)}
                />
              </label>

              <label>
                대체 텍스트
                <input
                  type="text"
                  value={image.alt}
                  onChange={(event) => updateImage(index, "alt", event.target.value)}
                />
              </label>

              {image.src ? (
                <div className="image-preview-card">
                  <img
                    alt={image.alt || `Preview ${index + 1}`}
                    className="image-preview"
                    src={image.src}
                  />
                </div>
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
              <p>여러 개의 CTA 버튼을 추가하고 버튼 폭 비율을 조절할 수 있습니다.</p>
            </div>
            <button className="ghost-button" onClick={addButton} type="button">
              버튼 추가
            </button>
          </div>

          <div className="editor-stack">
            {payload.buttons.map((button, index) => (
              <div className="editor-card" key={button.id}>
                <div className="editor-card-header">
                  <strong>버튼 {index + 1}</strong>
                  <div className="editor-actions">
                    <button
                      className="ghost-button"
                      disabled={index === 0}
                      onClick={() => moveButton(index, "up")}
                      type="button"
                    >
                      위로
                    </button>
                    <button
                      className="ghost-button"
                      disabled={index === payload.buttons.length - 1}
                      onClick={() => moveButton(index, "down")}
                      type="button"
                    >
                      아래로
                    </button>
                    <button
                      className="ghost-button"
                      disabled={payload.buttons.length <= 1}
                      onClick={() => removeButton(index)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="grid-two">
                  <label>
                    버튼 문구
                    <input
                      type="text"
                      value={button.label}
                      onChange={(event) => updateButton(index, "label", event.target.value)}
                    />
                  </label>

                  <label>
                    이동 링크
                    <input
                      type="url"
                      value={button.href}
                      onChange={(event) => updateButton(index, "href", event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  버튼 폭 비율
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
              <p>입력 항목을 추가, 삭제하고 필수 여부를 설정할 수 있습니다.</p>
            </div>
            <button className="ghost-button" onClick={addField} type="button">
              항목 추가
            </button>
          </div>

          <div className="editor-stack">
            {payload.formFields.map((field, index) => (
              <div className="editor-card" key={field.id}>
                <div className="editor-card-header">
                  <strong>입력 항목 {index + 1}</strong>
                  <div className="editor-actions">
                    <button
                      className="ghost-button"
                      disabled={index === 0}
                      onClick={() => moveField(index, "up")}
                      type="button"
                    >
                      위로
                    </button>
                    <button
                      className="ghost-button"
                      disabled={index === payload.formFields.length - 1}
                      onClick={() => moveField(index, "down")}
                      type="button"
                    >
                      아래로
                    </button>
                    <button
                      className="ghost-button"
                      disabled={payload.formFields.length <= 1}
                      onClick={() => removeField(index)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="grid-two">
                  <label>
                    항목 유형
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
                    필수 여부
                    <select
                      value={field.required ? "required" : "optional"}
                      onChange={(event) =>
                        updateField(index, "required", event.target.value === "required")
                      }
                    >
                      <option value="required">필수</option>
                      <option value="optional">선택</option>
                    </select>
                  </label>
                </div>

                <div className="grid-two">
                  <label>
                    질문/라벨
                    <input
                      type="text"
                      value={field.label}
                      onChange={(event) => updateField(index, "label", event.target.value)}
                    />
                  </label>

                  <label>
                    안내 문구
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
          HTML 소스
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
        {isSubmitting ? (isEdit ? "저장 중..." : "생성 중...") : isEdit ? "랜딩 저장" : "랜딩 만들기"}
      </button>

      {state.status !== "idle" ? (
        <p className={state.status === "success" ? "status-success" : "status-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
