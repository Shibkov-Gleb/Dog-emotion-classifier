from keras import layers, models

import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping

from tensorflow.keras.applications.resnet50 import preprocess_input, ResNet50

data_folder = '/data'

train_dataset = tf.keras.utils.image_dataset_from_directory(
    data_folder,
    validation_split=0.2,
    subset='training',
    seed=123,
    image_size=(224, 224),
    batch_size=64    
)
validation_dataset = tf.keras.utils.image_dataset_from_directory(
    data_folder,
    validation_split=0.2,
    subset="validation",
    seed=123,
    image_size=(224,224),
    batch_size=64
)

inputs = tf.keras.Input(shape=(224, 224, 3))
x = preprocess_input(inputs)                # Normalises pixel values
x = ResNet50(include_top=False, weights='imagenet')(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
outputs = layers.Dense(4, activation='softmax')(x)

fine_tuned_model = models.Model(inputs, outputs)

fine_tuned_model.compile(optimizer='adam', loss="SparseCategoricalCrossentropy", metrics=['accuracy'])

history = fine_tuned_model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=30,
    callbacks=EarlyStopping(patience=5, restore_best_weights=True)
)

validation_loss, validation_accuracy = fine_tuned_model.evaluate(validation_dataset)
print("Validation Loss:", validation_loss)
print("Validation Accuracy:", validation_accuracy)

fine_tuned_model.save('../saved_models/dog_emotion_resnet50.keras')


