import streamlit as st
from pathlib import Path

from document.parser import extract_pdf_text
from document.ocr import ocr_pdf
from rag.vectorstore import LocalVectorStore
from core.agent import SovereignAgent


st.set_page_config(
    page_title="Sovereign AI Workbench",
    page_icon="🔐",
    layout="wide"
)


st.title("🔐 Sovereign AI Workbench")

st.caption(
    "On-Premise • Zero External Egress • Controlled Agentic AI"
)


# Sidebar
with st.sidebar:

    st.header("System Status")

    st.success("LOCAL LLM")
    st.success("LOCAL RAG")
    st.success("POLICY ENGINE")
    st.success("AUDIT ACTIVE")

    st.error("EXTERNAL APIs BLOCKED")


st.divider()


uploaded_file = st.file_uploader(
    "Upload Confidential Document",
    type=["pdf", "png", "jpg", "jpeg"]
)


task = st.text_area(
    "Task",
    value=(
        "Analyze this inspection report against "
        "the maintenance SOP and prepare a "
        "corrective maintenance approval note."
    )
)


if uploaded_file:

    upload_dir = Path("data/uploads")
    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    file_path = (
        upload_dir /
        uploaded_file.name
    )

    file_path.write_bytes(
        uploaded_file.getbuffer()
    )

    st.success(
        f"Document received: {uploaded_file.name}"
    )


    if st.button(
        "🚀 EXECUTE SOVEREIGN TASK",
        type="primary"
    ):

        with st.status(
            "Agent executing...",
            expanded=True
        ) as status:

            st.write("🔍 Inspecting document")

            if uploaded_file.name.lower().endswith(".pdf"):

                pages = extract_pdf_text(
                    str(file_path)
                )

                document_text = "\n".join(
                    p["text"]
                    for p in pages
                )

                # OCR fallback
                if len(document_text.strip()) < 100:

                    st.write(
                        "📷 Scanned document detected — OCR"
                    )

                    pages = ocr_pdf(
                        str(file_path)
                    )

                    document_text = "\n".join(
                        p["text"]
                        for p in pages
                    )

            else:

                document_text = (
                    "Image document uploaded. "
                    "Vision processing required."
                )


            st.write(
                "🛡️ Applying security classification"
            )


            st.write(
                "🧠 Selecting local model"
            )


            st.write(
                "📚 Searching organizational knowledge"
            )


            store = LocalVectorStore()

            agent = SovereignAgent(
                store
            )


            result = agent.run(
                task,
                document_text
            )


            status.update(
                label="Task execution complete",
                state="complete"
            )


        # Results

        st.header("Execution Result")

        col1, col2, col3 = st.columns(3)

        with col1:

            st.metric(
                "Classification",
                result["security"]["classification"]
            )

        with col2:

            st.metric(
                "Model",
                result["model"]["name"]
            )

        with col3:

            st.metric(
                "Verification",
                result["verification"]["status"]
            )


        st.subheader("Agent Output")

        st.write(
            result["answer"]
        )


        st.subheader(
            "🔐 Governance Decision"
        )


        if result["human_required"]:

            st.warning(
                "HIGH-RISK / CONFIDENTIAL — "
                "Human approval required."
            )

            approve = st.button(
                "✅ APPROVE & GENERATE DELIVERABLE"
            )

            reject = st.button(
                "❌ REJECT"
            )

        else:

            st.success(
                "Low-risk task — automatic output permitted."
            )