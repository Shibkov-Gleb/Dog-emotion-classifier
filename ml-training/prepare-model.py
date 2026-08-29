import sys

import keras
import tf_keras


def main():
    source_path = sys.argv[1]
    output_path = sys.argv[2]

    source_model = keras.models.load_model(source_path, compile=False)
    source_resnet = source_model.get_layer("resnet50")
    source_classifier = source_model.get_layer("dense_5")

    inputs = tf_keras.Input(shape=(224, 224, 3), name="image")
    resnet = tf_keras.applications.ResNet50(
        include_top=False,
        weights=None,
        input_tensor=inputs,
    )
    pooled_features = tf_keras.layers.GlobalAveragePooling2D()(resnet.output)
    outputs = tf_keras.layers.Dense(4, activation="softmax")(pooled_features)
    deployment_model = tf_keras.Model(inputs, outputs, name="dog_emotion_classifier")

    resnet.set_weights(source_resnet.get_weights())
    deployment_model.layers[-1].set_weights(source_classifier.get_weights())
    deployment_model.save(output_path, include_optimizer=False)


if __name__ == "__main__":
    main()
