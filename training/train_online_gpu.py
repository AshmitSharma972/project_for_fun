"""Run in Google Colab or Kaggle, not as an IncidentMind runtime dependency."""
import argparse
from datasets import load_dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer, DataCollatorWithPadding, Trainer, TrainingArguments

def main() -> None:
    parser = argparse.ArgumentParser(); parser.add_argument("--data", required=True); parser.add_argument("--output", default="incident-classifier")
    args = parser.parse_args()
    dataset = load_dataset("json", data_files=args.data, split="train").train_test_split(test_size=0.1, seed=42)
    labels = sorted(set(dataset["train"]["label"])); label_to_id = {label: i for i, label in enumerate(labels)}
    tokenizer = AutoTokenizer.from_pretrained("distilbert/distilbert-base-uncased")
    def tokenize(batch):
        result = tokenizer(batch["text"], truncation=True, max_length=128)
        result["labels"] = [label_to_id[value] for value in batch["label"]]; return result
    tokenized = dataset.map(tokenize, batched=True, remove_columns=dataset["train"].column_names)
    model = AutoModelForSequenceClassification.from_pretrained("distilbert/distilbert-base-uncased", num_labels=len(labels), id2label=dict(enumerate(labels)), label2id=label_to_id)
    trainer = Trainer(model=model, args=TrainingArguments(output_dir=args.output, num_train_epochs=1, per_device_train_batch_size=32, per_device_eval_batch_size=64, eval_strategy="epoch", fp16=True, report_to="none"), train_dataset=tokenized["train"], eval_dataset=tokenized["test"], processing_class=tokenizer, data_collator=DataCollatorWithPadding(tokenizer=tokenizer))
    trainer.train(); trainer.save_model(args.output)
if __name__ == "__main__": main()
